use aws_lambda_events::apigw::{ApiGatewayProxyRequest, ApiGatewayProxyResponse};
use aws_lambda_runtime::{run, service_fn, Error, LambdaEvent};
use aws_sdk_dynamodb::model::AttributeValue;
use journal_common::{
    error_response, extract_tenant_context, get_dynamo_client, json_response, publish_event, JournalError,
};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use chrono::{DateTime, Utc, Duration};

// Analytics data structures
#[derive(Debug, Serialize)]
struct EntryFrequency {
    date: String,
    count: i32,
}

#[derive(Debug, Serialize)]
struct CategoryDistribution {
    category: String,
    count: i32,
    percentage: f32,
}

#[derive(Debug, Serialize)]
struct MoodTrend {
    date: String,
    average_sentiment: f32,
    entry_count: i32,
}

#[derive(Debug, Serialize)]
struct WritingPattern {
    hour_of_day: i32,
    count: i32,
}

#[derive(Debug, Serialize)]
struct AnalyticsSummary {
    entry_count: i32,
    entry_frequency: Vec<EntryFrequency>,
    category_distribution: Vec<CategoryDistribution>,
    mood_trends: Vec<MoodTrend>,
    writing_patterns: Vec<WritingPattern>,
    word_count_average: i32,
    top_keywords: Vec<String>,
    longest_streak_days: i32,
    current_streak_days: i32,
}

#[derive(Debug, Deserialize, Default)]
struct AnalyticsQueryParams {
    start_date: Option<String>,
    end_date: Option<String>,
    time_period: Option<String>, // day, week, month, year
}

async fn get_analytics_summary(
    event: ApiGatewayProxyRequest,
) -> Result<ApiGatewayProxyResponse, Error> {
    // Extract tenant context
    let claims = match extract_tenant_context(&event.headers).await {
        Ok(claims) => claims,
        Err(e) => return Ok(error_response(401, &e)),
    };
    
    // Parse query parameters
    let query_params = serde_qs::from_str::<AnalyticsQueryParams>(
        &event.query_string_parameters.unwrap_or_default().to_string()
    ).unwrap_or_default();
    
    // Determine date range
    let end_date = match &query_params.end_date {
        Some(date) => match date.parse::<DateTime<Utc>>() {
            Ok(date) => date,
            Err(_) => Utc::now(),
        },
        None => Utc::now(),
    };
    
    let start_date = match &query_params.start_date {
        Some(date) => match date.parse::<DateTime<Utc>>() {
            Ok(date) => date,
            Err(_) => end_date - Duration::days(30), // Default to 30 days
        },
        None => {
            // Default time period based on query param
            match query_params.time_period.as_deref() {
                Some("day") => end_date - Duration::days(1),
                Some("week") => end_date - Duration::days(7),
                Some("month") => end_date - Duration::days(30),
                Some("year") => end_date - Duration::days(365),
                _ => end_date - Duration::days(30), // Default to 30 days
            }
        }
    };
    
    // Get entries for the date range
    let entries = match get_user_entries(
        &claims.tenant_id,
        &claims.sub,
        &start_date.to_rfc3339(),
        &end_date.to_rfc3339(),
    ).await {
        Ok(entries) => entries,
        Err(e) => return Ok(error_response(500, &e)),
    };
    
    // Get insights for the entries
    let insights = match get_user_insights(
        &claims.tenant_id,
        &claims.sub,
        &entries.iter().map(|e| e["id"].as_s().unwrap()).collect::<Vec<_>>(),
    ).await {
        Ok(insights) => insights,
        Err(e) => return Ok(error_response(500, &e)),
    };
    
    // Process entry frequency
    let entry_frequency = calculate_entry_frequency(&entries, start_date, end_date);
    
    // Process category distribution
    let category_distribution = calculate_category_distribution(&entries);
    
    // Process mood trends
    let mood_trends = calculate_mood_trends(&entries, &insights);
    
    // Process writing patterns
    let writing_patterns = calculate_writing_patterns(&entries);
    
    // Calculate streaks
    let (longest_streak, current_streak) = calculate_streaks(&entries);
    
    // Calculate average word count
    let word_count_average = calculate_average_word_count(&entries);
    
    // Get top keywords
    let top_keywords = get_top_keywords(&insights, 10);
    
    // Assemble summary
    let summary = AnalyticsSummary {
        entry_count: entries.len() as i32,
        entry_frequency,
        category_distribution,
        mood_trends,
        writing_patterns,
        word_count_average,
        top_keywords,
        longest_streak_days: longest_streak,
        current_streak_days: current_streak,
    };
    
    Ok(json_response(200, &summary))
}

async fn get_user_entries(
    tenant_id: &str,
    user_id: &str,
    start_date: &str,
    end_date: &str,
) -> Result<Vec<HashMap<String, AttributeValue>>, JournalError> {
    let dynamo_client = get_dynamo_client().await;
    let table_name = std::env::var("ENTRIES_TABLE").unwrap_or_else(|_| "reflekt-entries".to_string());
    
    // Query DynamoDB for entries
    let result = dynamo_client
        .query()
        .table_name(table_name)
        .index_name("UserIndex")
        .key_condition_expression("tenant_id = :tenant_id AND user_id = :user_id")
        .expression_attribute_values(":tenant_id", AttributeValue::S(tenant_id.to_string()))
        .expression_attribute_values(":user_id", AttributeValue::S(user_id.to_string()))
        .filter_expression("created_at BETWEEN :start_date AND :end_date")
        .expression_attribute_values(":start_date", AttributeValue::S(start_date.to_string()))
        .expression_attribute_values(":end_date", AttributeValue::S(end_date.to_string()))
        .send()
        .await
        .map_err(|e| JournalError::DatabaseError(format!("Failed to query entries: {}", e)))?;
    
    Ok(result.items().unwrap_or_default().to_vec())
}

async fn get_user_insights(
    tenant_id: &str,
    user_id: &str,
    entry_ids: &[&str],
) -> Result<Vec<HashMap<String, AttributeValue>>, JournalError> {
    if entry_ids.is_empty() {
        return Ok(vec![]);
    }
    
    let dynamo_client = get_dynamo_client().await;
    let table_name = std::env::var("INSIGHTS_TABLE").unwrap_or_else(|_| "reflekt-insights".to_string());
    
    // Batch get insights
    let mut insights = Vec::new();
    
    // DynamoDB batch size limit is 100
    for chunk in entry_ids.chunks(100) {
        let mut keys = Vec::new();
        
        for entry_id in chunk {
            let mut key = HashMap::new();
            key.insert("entry_id".to_string(), AttributeValue::S(entry_id.to_string()));
            key.insert("tenant_id".to_string(), AttributeValue::S(tenant_id.to_string()));
            keys.push(key);
        }
        
        let result = dynamo_client
            .batch_get_item()
            .request_items(table_name.clone(), keys)
            .send()
            .await
            .map_err(|e| JournalError::DatabaseError(format!("Failed to batch get insights: {}", e)))?;
        
        if let Some(responses) = result.responses {
            if let Some(items) = responses.get(&table_name) {
                insights.extend(items.to_vec());
            }
        }
    }
    
    Ok(insights)
}

fn calculate_entry_frequency(
    entries: &[HashMap<String, AttributeValue>],
    start_date: DateTime<Utc>,
    end_date: DateTime<Utc>,
) -> Vec<EntryFrequency> {
    // Group entries by date
    let mut frequency_map = HashMap::new();
    
    // Initialize all dates in range with zero
    let days = (end_date - start_date).num_days() + 1;
    for day_offset in 0..days {
        let date = (start_date + Duration::days(day_offset)).date().format("%Y-%m-%d").to_string();
        frequency_map.insert(date, 0);
    }
    
    // Count entries for each date
    for entry in entries {
        if let Some(AttributeValue::S(created_at)) = entry.get("created_at") {
            if let Ok(date_time) = created_at.parse::<DateTime<Utc>>() {
                let date = date_time.date().format("%Y-%m-%d").to_string();
                *frequency_map.entry(date).or_insert(0) += 1;
            }
        }
    }
    
    // Convert to vector sorted by date
    let mut frequencies: Vec<EntryFrequency> = frequency_map
        .into_iter()
        .map(|(date, count)| EntryFrequency { date, count })
        .collect();
    
    frequencies.sort_by(|a, b| a.date.cmp(&b.date));
    frequencies
}

fn calculate_category_distribution(
    entries: &[HashMap<String, AttributeValue>],
) -> Vec<CategoryDistribution> {
    // Count entries by category
    let mut category_counts = HashMap::new();
    let total_entries = entries.len() as f32;
    
    for entry in entries {
        if let Some(AttributeValue::Ss(categories)) = entry.get("categories") {
            for category in categories {
                *category_counts.entry(category.clone()).or_insert(0) += 1;
            }
        }
    }
    
    // Convert to percentage
    let mut distribution: Vec<CategoryDistribution> = category_counts
        .into_iter()
        .map(|(category, count)| {
            let percentage = if total_entries > 0.0 {
                (count as f32 / total_entries) * 100.0
            } else {
                0.0
            };
            
            CategoryDistribution {
                category,
                count,
                percentage,
            }
        })
        .collect();
    
    // Sort by count descending
    distribution.sort_by(|a, b| b.count.cmp(&a.count));
    distribution
}

fn calculate_mood_trends(
    entries: &[HashMap<String, AttributeValue>],
    insights: &[HashMap<String, AttributeValue>],
) -> Vec<MoodTrend> {
    // Create map of entry_id to sentiment score
    let mut sentiment_map = HashMap::new();
    
    for insight in insights {
        if let (
            Some(AttributeValue::S(entry_id)),
            Some(AttributeValue::N(score)),
        ) = (
            insight.get("entry_id"),
            insight.get("sentiment_score"),
        ) {
            if let Ok(score_val) = score.parse::<f32>() {
                sentiment_map.insert(entry_id.clone(), score_val);
            }
        }
    }
    
    // Group by date
    let mut mood_by_date = HashMap::new();
    
    for entry in entries {
        if let (
            Some(AttributeValue::S(created_at)),
            Some(AttributeValue::S(entry_id)),
        ) = (
            entry.get("created_at"),
            entry.get("id"),
        ) {
            if let Ok(date_time) = created_at.parse::<DateTime<Utc>>() {
                let date = date_time.date().format("%Y-%m-%d").to_string();
                
                if let Some(score) = sentiment_map.get(entry_id) {
                    let (total, count) = mood_by_date.entry(date).or_insert((0.0, 0));
                    *total += score;
                    *count += 1;
                }
            }
        }
    }
    
    // Calculate averages
    let mut trends: Vec<MoodTrend> = mood_by_date
        .into_iter()
        .map(|(date, (total, count))| {
            MoodTrend {
                date,
                average_sentiment: total / count as f32,
                entry_count: count,
            }
        })
        .collect();
    
    // Sort by date
    trends.sort_by(|a, b| a.date.cmp(&b.date));
    trends
}

fn calculate_writing_patterns(
    entries: &[HashMap<String, AttributeValue>],
) -> Vec<WritingPattern> {
    // Count entries by hour of day
    let mut hour_counts = HashMap::new();
    
    // Initialize all hours with zero
    for hour in 0..24 {
        hour_counts.insert(hour, 0);
    }
    
    for entry in entries {
        if let Some(AttributeValue::S(created_at)) = entry.get("created_at") {
            if let Ok(date_time) = created_at.parse::<DateTime<Utc>>() {
                let hour = date_time.hour();
                *hour_counts.entry(hour as i32).or_insert(0) += 1;
            }
        }
    }
    
    // Convert to vector
    let mut patterns: Vec<WritingPattern> = hour_counts
        .into_iter()
        .map(|(hour_of_day, count)| WritingPattern { hour_of_day, count })
        .collect();
    
    // Sort by hour
    patterns.sort_by(|a, b| a.hour_of_day.cmp(&b.hour_of_day));
    patterns
}

fn calculate_streaks(
    entries: &[HashMap<String, AttributeValue>],
) -> (i32, i32) {
    // Get all entry dates
    let mut entry_dates = HashSet::new();
    
    for entry in entries {
        if let Some(AttributeValue::S(created_at)) = entry.get("created_at") {
            if let Ok(date_time) = created_at.parse::<DateTime<Utc>>() {
                let date = date_time.date().format("%Y-%m-%d").to_string();
                entry_dates.insert(date);
            }
        }
    }
    
    if entry_dates.is_empty() {
        return (0, 0);
    }
    
    // Sort dates
    let mut dates: Vec<String> = entry_dates.into_iter().collect();
    dates.sort();
    
    // Today's date
    let today = Utc::now().date().format("%Y-%m-%d").to_string();
    
    // Calculate longest streak
    let mut longest_streak = 0;
    let mut current_streak = 0;
    let mut streak = 0;
    
    for i in 0..dates.len() {
        if i > 0 {
            let prev_date = DateTime::parse_from_str(&format!("{} 00:00:00 +0000", &dates[i-1]), "%Y-%m-%d %H:%M:%S %z").unwrap();
            let curr_date = DateTime::parse_from_str(&format!("{} 00:00:00 +0000", &dates[i]), "%Y-%m-%d %H:%M:%S %z").unwrap();
            
            let day_diff = (curr_date - prev_date).num_days();
            
            if day_diff == 1 {
                // Consecutive days
                streak += 1;
            } else {
                // Break in streak
                if streak > longest_streak {
                    longest_streak = streak;
                }
                streak = 1;
            }
        } else {
            streak = 1;
        }
    }
    
    if streak > longest_streak {
        longest_streak = streak;
    }
    
    // Calculate current streak
    if dates.contains(&today) {
        current_streak = 1;
        let mut curr_date = today;
        
        loop {
            // Get previous day
            let date = DateTime::parse_from_str(&format!("{} 00:00:00 +0000", &curr_date), "%Y-%m-%d %H:%M:%S %z").unwrap();
            let prev_date = (date - Duration::days(1)).format("%Y-%m-%d").to_string();
            
            if dates.contains(&prev_date) {
                current_streak += 1;
                curr_date = prev_date;
            } else {
                break;
            }
        }
    }
    
    (longest_streak, current_streak)
}

fn calculate_average_word_count(
    entries: &[HashMap<String, AttributeValue>],
) -> i32 {
    if entries.is_empty() {
        return 0;
    }
    
    let mut total_words = 0;
    
    for entry in entries {
        if let Some(AttributeValue::S(content)) = entry.get("content") {
            total_words += content.split_whitespace().count();
        }
    }
    
    (total_words as i32) / (entries.len() as i32)
}

fn get_top_keywords(
    insights: &[HashMap<String, AttributeValue>],
    limit: usize,
) -> Vec<String> {
    // Count keyword occurrences
    let mut keyword_counts = HashMap::new();
    
    for insight in insights {
        if let Some(AttributeValue::Ss(keywords)) = insight.get("keywords") {
            for keyword in keywords {
                *keyword_counts.entry(keyword.clone()).or_insert(0) += 1;
            }
        }
    }
    
    // Convert to vector and sort
    let mut keywords: Vec<(String, i32)> = keyword_counts.into_iter().collect();
    keywords.sort_by(|a, b| b.1.cmp(&a.1)); // Sort by count descending
    
    // Take top N
    keywords.iter()
        .take(limit)
        .map(|(k, _)| k.clone())
        .collect()
}

async fn get_mood_analytics(
    event: ApiGatewayProxyRequest,
) -> Result<ApiGatewayProxyResponse, Error> {
    // Extract tenant context
    let claims = match extract_tenant_context(&event.headers).await {
        Ok(claims) => claims,
        Err(e) => return Ok(error_response(401, &e)),
    };
    
    // Parse query parameters - reuse same structure
    let query_params = serde_qs::from_str::<AnalyticsQueryParams>(
        &event.query_string_parameters.unwrap_or_default().to_string()
    ).unwrap_or_default();
    
    // Determine date range (reuse code from summary)
    let end_date = match &query_params.end_date {
        Some(date) => match date.parse::<DateTime<Utc>>() {
            Ok(date) => date,
            Err(_) => Utc::now(),
        },
        None => Utc::now(),
    };
    
    let start_date = match &query_params.start_date {
        Some(date) => match date.parse::<DateTime<Utc>>() {
            Ok(date) => date,
            Err(_) => end_date - Duration::days(30), // Default to 30 days
        },
        None => {
            // Default time period based on query param
            match query_params.time_period.as_deref() {
                Some("day") => end_date - Duration::days(1),
                Some("week") => end_date - Duration::days(7),
                Some("month") => end_date - Duration::days(30),
                Some("year") => end_date - Duration::days(365),
                _ => end_date - Duration::days(30), // Default to 30 days
            }
        }
    };
    
    // Get entries and insights
    let entries = match get_user_entries(
        &claims.tenant_id,
        &claims.sub,
        &start_date.to_rfc3339(),
        &end_date.to_rfc3339(),
    ).await {
        Ok(entries) => entries,
        Err(e) => return Ok(error_response(500, &e)),
    };
    
    let insights = match get_user_insights(
        &claims.tenant_id,
        &claims.sub,
        &entries.iter().map(|e| e["id"].as_s().unwrap()).collect::<Vec<_>>(),
    ).await {
        Ok(insights) => insights,
        Err(e) => return Ok(error_response(500, &e)),
    };
    
    // Calculate mood trends
    let mood_trends = calculate_mood_trends(&entries, &insights);
    
    // Additional mood stats
    let mut positive_count = 0;
    let mut negative_count = 0;
    let mut neutral_count = 0;
    
    for insight in &insights {
        if let Some(AttributeValue::S(sentiment)) = insight.get("sentiment") {
            match sentiment.as_str() {
                "positive" => positive_count += 1,
                "negative" => negative_count += 1,
                _ => neutral_count += 1,
            }
        }
    }
    
    let total_insights = insights.len() as f32;
    let positive_percentage = if total_insights > 0.0 {
        (positive_count as f32 / total_insights) * 100.0
    } else {
        0.0
    };
    
    let negative_percentage = if total_insights > 0.0 {
        (negative_count as f32 / total_insights) * 100.0
    } else {
        0.0
    };
    
    let neutral_percentage = if total_insights > 0.0 {
        (neutral_count as f32 / total_insights) * 100.0
    } else {
        0.0
    };
    
    // Prepare response
    let response = serde_json::json!({
        "mood_trends": mood_trends,
        "mood_distribution": {
            "positive": {
                "count": positive_count,
                "percentage": positive_percentage
            },
            "negative": {
                "count": negative_count,
                "percentage": negative_percentage
            },
            "neutral": {
                "count": neutral_count,
                "percentage": neutral_percentage
            }
        },
        "date_range": {
            "start_date": start_date.to_rfc3339(),
            "end_date": end_date.to_rfc3339()
        }
    });
    
    Ok(json_response(200, &response))
}

async fn request_analytics_generation(
    event: ApiGatewayProxyRequest,
) -> Result<ApiGatewayProxyResponse, Error> {
    // Extract tenant context
    let claims = match extract_tenant_context(&event.headers).await {
        Ok(claims) => claims,
        Err(e) => return Ok(error_response(401, &e)),
    };
    
    // Publish event to trigger analytics generation
    let event_detail = serde_json::json!({
        "tenant_id": claims.tenant_id,
        "user_id": claims.sub,
        "requested_at": Utc::now().to_rfc3339(),
    });
    
    if let Err(e) = publish_event("AnalyticsRequested", event_detail).await {
        return Ok(error_response(
            500,
            &JournalError::EventError(format!("Failed to request analytics: {}", e)),
        ));
    }
    
    Ok(json_response(202, &serde_json::json!({
        "message": "Analytics generation requested",
        "status": "processing"
    })))
}

async fn handler(
    event: LambdaEvent<ApiGatewayProxyRequest>,
) -> Result<ApiGatewayProxyResponse, Error> {
    // Set up tracing
    tracing_subscriber::fmt::init();
    
    let path = event.payload.path.clone().unwrap_or_default();
    let method = event.payload.http_method.clone();
    
    tracing::info!("Handling request: {} {}", method, path);
    
    match (method.as_str(), path.as_str()) {
        ("GET", "/analytics") => get_analytics_summary(event.payload).await,
        ("POST", "/analytics") => request_analytics_generation(event.payload).await,
        ("GET", "/analytics/mood") => get_mood_analytics(event.payload).await,
        // More endpoints can be added
        _ => Ok(error_response(
            404,
            &JournalError::NotFoundError("Route not found".into()),
        )),
    }
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    run(service_fn(handler)).await
}
