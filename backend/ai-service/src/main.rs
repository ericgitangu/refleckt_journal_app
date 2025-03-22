use aws_lambda_events::event::cloudwatch_events::CloudWatchEvent;
use aws_lambda_runtime::{run, service_fn, Error, LambdaEvent};
use aws_sdk_dynamodb::model::AttributeValue;
use journal_common::{
    get_dynamo_client, get_s3_client, publish_event, JournalError,
};
use rust_bert::pipelines::sentiment::{SentimentModel, SentimentPolarity};
use rust_bert::pipelines::keywords::KeywordExtractionModel;
use rust_bert::RustBertError;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use tracing;
use tracing_subscriber;

// Event data structure
#[derive(Debug, Deserialize)]
struct EntryEvent {
    entry_id: String,
    tenant_id: String,
    user_id: String,
    title: String,
    content: String,
}

// Analysis result structure
#[derive(Debug, Serialize)]
struct EntryAnalysis {
    entry_id: String,
    tenant_id: String,
    user_id: String,
    sentiment: String,
    sentiment_score: f32,
    keywords: Vec<String>,
    suggested_categories: Vec<String>,
}

// Lazy loaded models
struct AIModels {
    sentiment_model: SentimentModel,
    keyword_model: KeywordExtractionModel,
}

impl AIModels {
    fn new() -> Result<Self, RustBertError> {
        let sentiment_model = SentimentModel::new(Default::default())?;
        let keyword_model = KeywordExtractionModel::new(Default::default())?;
        
        Ok(Self {
            sentiment_model,
            keyword_model,
        })
    }
}

async fn analyze_entry(
    event: EntryEvent,
    models: &AIModels,
) -> Result<EntryAnalysis, JournalError> {
    // Combine title and content for analysis
    let text = format!("{} {}", event.title, event.content);
    
    // Analyze sentiment
    let sentiment_output = models.sentiment_model.predict(&[&text]);
    
    let (sentiment, sentiment_score) = match sentiment_output[0].polarity {
        SentimentPolarity::Positive => ("positive", sentiment_output[0].score),
        SentimentPolarity::Negative => ("negative", -sentiment_output[0].score),
        SentimentPolarity::Neutral => ("neutral", 0.0),
    };
    
    // Extract keywords
    let keywords = models.keyword_model.predict(&[&text], 5, 0.3);
    let keyword_list = keywords[0].iter().map(|k| k.0.clone()).collect();
    
    // For simplicity, let's use the keywords as suggested categories
    // In a real implementation, we'd use a proper classification model
    let suggested_categories = keywords[0]
        .iter()
        .filter(|(_, score)| *score > 0.5)
        .map(|(k, _)| k.clone())
        .collect();
    
    Ok(EntryAnalysis {
        entry_id: event.entry_id,
        tenant_id: event.tenant_id,
        user_id: event.user_id,
        sentiment: sentiment.to_string(),
        sentiment_score,
        keywords: keyword_list,
        suggested_categories,
    })
}

async fn save_analysis(
    analysis: &EntryAnalysis,
) -> Result<(), JournalError> {
    let dynamo_client = get_dynamo_client().await;
    let table_name = std::env::var("ENTRIES_TABLE").unwrap_or_else(|_| "reflekt-entries".to_string());
    
    // Update entry with sentiment score
    let result = dynamo_client
        .update_item()
        .table_name(table_name)
        .key("id", AttributeValue::S(analysis.entry_id.clone()))
        .key("tenant_id", AttributeValue::S(analysis.tenant_id.clone()))
        .update_expression("SET sentiment_score = :score")
        .expression_attribute_values(":score", AttributeValue::N(analysis.sentiment_score.to_string()))
        .send()
        .await;
    
    if let Err(e) = result {
        return Err(JournalError::DatabaseError(format!("Failed to update entry with sentiment: {}", e)));
    }
    
    // Save to insights table
    let insights_table = std::env::var("INSIGHTS_TABLE").unwrap_or_else(|_| "reflekt-insights".to_string());
    
    let mut item = HashMap::new();
    item.insert("entry_id".to_string(), AttributeValue::S(analysis.entry_id.clone()));
    item.insert("tenant_id".to_string(), AttributeValue::S(analysis.tenant_id.clone()));
    item.insert("user_id".to_string(), AttributeValue::S(analysis.user_id.clone()));
    item.insert("sentiment".to_string(), AttributeValue::S(analysis.sentiment.clone()));
    item.insert("sentiment_score".to_string(), AttributeValue::N(analysis.sentiment_score.to_string()));
    
    if !analysis.keywords.is_empty() {
        item.insert("keywords".to_string(), AttributeValue::Ss(analysis.keywords.clone()));
    }
    
    if !analysis.suggested_categories.is_empty() {
        item.insert(
            "suggested_categories".to_string(),
            AttributeValue::Ss(analysis.suggested_categories.clone()),
        );
    }
    
    // Add created_at timestamp
    let timestamp = chrono::Utc::now().to_rfc3339();
    item.insert("created_at".to_string(), AttributeValue::S(timestamp));
    
    let result = dynamo_client
        .put_item()
        .table_name(insights_table)
        .set_item(Some(item))
        .send()
        .await;
    
    if let Err(e) = result {
        return Err(JournalError::DatabaseError(format!("Failed to save insights: {}", e)));
    }
    
    Ok(())
}

async fn handler(
    event: LambdaEvent<CloudWatchEvent<Value>>,
) -> Result<(), Error> {
    // Set up tracing
    tracing_subscriber::fmt::init();
    
    // Parse event
    let entry_event = match serde_json::from_value::<EntryEvent>(event.payload.detail) {
        Ok(entry) => entry,
        Err(e) => {
            tracing::error!("Failed to parse event: {}", e);
            return Err(Box::new(JournalError::ValidationError(format!("Invalid event data: {}", e))));
        }
    };
    
    tracing::info!(
        "Processing entry: {} for user {} in tenant {}",
        entry_event.entry_id,
        entry_event.user_id,
        entry_event.tenant_id
    );
    
    // Initialize AI models
    let models = match AIModels::new() {
        Ok(models) => models,
        Err(e) => {
            tracing::error!("Failed to initialize AI models: {}", e);
            return Err(Box::new(JournalError::InternalError(format!("Failed to initialize AI models: {}", e))));
        }
    };
    
    // Analyze entry
    let analysis = match analyze_entry(entry_event, &models).await {
        Ok(analysis) => analysis,
        Err(e) => {
            tracing::error!("Analysis failed: {}", e);
            return Err(Box::new(e));
        }
    };
    
    // Save analysis results
    if let Err(e) = save_analysis(&analysis).await {
        tracing::error!("Failed to save analysis: {}", e);
        return Err(Box::new(e));
    }
    
    // Publish event for insights ready
    let event_detail = serde_json::json!({
        "entry_id": analysis.entry_id,
        "tenant_id": analysis.tenant_id,
        "user_id": analysis.user_id,
        "sentiment": analysis.sentiment,
        "sentiment_score": analysis.sentiment_score,
        "keywords": analysis.keywords,
        "suggested_categories": analysis.suggested_categories,
    });
    
    if let Err(e) = publish_event("AiInsightsReady", event_detail).await {
        tracing::error!("Failed to publish event: {}", e);
        // Continue anyway - this is non-critical
    }
    
    tracing::info!("Analysis completed successfully");
    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    run(service_fn(handler)).await
}
