use aws_lambda_events::apigw::{ApiGatewayProxyRequest, ApiGatewayProxyResponse};
use aws_lambda_events::encodings::Body;
use aws_lambda_runtime::{run, service_fn, Error, LambdaEvent};
use aws_sdk_dynamodb::model::AttributeValue;
use journal_common::{
    error_response, extract_tenant_context, get_dynamo_client, json_response, publish_event, JournalError,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

// Entry model matching the frontend interface
#[derive(Debug, Serialize, Deserialize)]
struct Entry {
    id: String,
    title: String,
    content: String,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "updatedAt")]
    updated_at: String,
    #[serde(skip_serializing)]
    tenant_id: String,
    user_id: String,
    categories: Vec<String>,
    tags: Option<Vec<String>>,
    mood: Option<String>,
    location: Option<String>,
    word_count: Option<i32>,
    sentiment_score: Option<f64>,
}

// Input models for create/update
#[derive(Debug, Deserialize)]
struct CreateEntryInput {
    title: String,
    content: String,
    categories: Vec<String>,
    tags: Option<Vec<String>>,
    mood: Option<String>,
    location: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UpdateEntryInput {
    title: Option<String>,
    content: Option<String>,
    categories: Option<Vec<String>>,
    tags: Option<Vec<String>>,
    mood: Option<String>,
    location: Option<String>,
}

// Query parameters for list/search
#[derive(Debug, Serialize, Deserialize, Default)]
struct EntryQueryParams {
    category: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
    search_text: Option<String>,
    limit: Option<i32>,
    next_token: Option<String>,
}

async fn create_entry(
    event: ApiGatewayProxyRequest,
) -> Result<ApiGatewayProxyResponse, Error> {
    // Extract tenant context
    let claims = match extract_tenant_context(&event.headers).await {
        Ok(claims) => claims,
        Err(e) => return Ok(error_response(401, &e)),
    };
    
    // Parse request body
    let body = event.body.ok_or_else(|| JournalError::ValidationError("Missing request body".into()))?;
    let input: CreateEntryInput = match serde_json::from_str(&body) {
        Ok(input) => input,
        Err(e) => return Ok(error_response(400, &JournalError::ValidationError(e.to_string()))),
    };
    
    // Validate input
    if input.title.is_empty() || input.content.is_empty() {
        return Ok(error_response(400, &JournalError::ValidationError("Title and content are required".into())));
    }
    
    // Generate entry ID
    let entry_id = Uuid::new_v4().to_string();
    let timestamp = chrono::Utc::now().to_rfc3339();
    
    // Prepare DynamoDB item
    let dynamo_client = get_dynamo_client().await;
    let mut item = HashMap::new();
    
    item.insert("id".to_string(), AttributeValue::S(entry_id.clone()));
    item.insert("tenant_id".to_string(), AttributeValue::S(claims.tenant_id.clone()));
    item.insert("user_id".to_string(), AttributeValue::S(claims.sub.clone()));
    item.insert("title".to_string(), AttributeValue::S(input.title.clone()));
    item.insert("content".to_string(), AttributeValue::S(input.content.clone()));
    item.insert("created_at".to_string(), AttributeValue::S(timestamp.clone()));
    item.insert("updated_at".to_string(), AttributeValue::S(timestamp.clone()));
    
    // Calculate word count
    let word_count = input.content.split_whitespace().count() as i32;
    item.insert("word_count".to_string(), AttributeValue::N(word_count.to_string()));
    
    // Add categories
    if !input.categories.is_empty() {
        item.insert(
            "categories".to_string(),
            AttributeValue::Ss(input.categories.clone()),
        );
    }
    
    // Add tags if present
    if let Some(tags) = &input.tags {
        if !tags.is_empty() {
            item.insert("tags".to_string(), AttributeValue::Ss(tags.clone()));
        }
    }
    
    // Add mood if present
    if let Some(mood) = &input.mood {
        item.insert("mood".to_string(), AttributeValue::S(mood.clone()));
    }
    
    // Add location if present
    if let Some(location) = &input.location {
        item.insert("location".to_string(), AttributeValue::S(location.clone()));
    }
    
    // Save to DynamoDB
    let table_name = std::env::var("ENTRIES_TABLE").unwrap_or_else(|_| "reflekt-entries".to_string());
    
    match dynamo_client
        .put_item()
        .table_name(table_name)
        .set_item(Some(item))
        .send()
        .await
    {
        Ok(_) => {
            // Create the entry response
            let entry = Entry {
                id: entry_id.clone(),
                title: input.title,
                content: input.content,
                created_at: timestamp.clone(),
                updated_at: timestamp,
                tenant_id: claims.tenant_id.clone(),
                user_id: claims.sub.clone(),
                categories: input.categories,
                tags: input.tags,
                mood: input.mood,
                location: input.location,
                word_count: Some(word_count),
                sentiment_score: None,
            };
            
            // Publish event for processing
            let event_detail = serde_json::json!({
                "entry_id": entry_id,
                "tenant_id": claims.tenant_id,
                "user_id": claims.sub,
                "title": entry.title,
                "content": entry.content,
            });
            
            if let Err(e) = publish_event("EntryCreated", event_detail).await {
                tracing::warn!("Failed to publish event: {}", e);
                // Continue anyway - event publishing should not block the response
            }
            
            Ok(json_response(201, &entry))
        }
        Err(e) => Ok(error_response(
            500,
            &JournalError::DatabaseError(format!("Failed to save entry: {}", e)),
        )),
    }
}

async fn get_entry(
    event: ApiGatewayProxyRequest,
) -> Result<ApiGatewayProxyResponse, Error> {
    // Extract tenant context
    let claims = match extract_tenant_context(&event.headers).await {
        Ok(claims) => claims,
        Err(e) => return Ok(error_response(401, &e)),
    };
    
    // Get entry ID from path
    let entry_id = match event.path_parameters.get("id") {
        Some(id) => id,
        None => return Ok(error_response(400, &JournalError::ValidationError("Missing entry ID".into()))),
    };
    
    // Get entry from DynamoDB
    let dynamo_client = get_dynamo_client().await;
    let table_name = std::env::var("ENTRIES_TABLE").unwrap_or_else(|_| "reflekt-entries".to_string());
    
    let result = dynamo_client
        .get_item()
        .table_name(table_name)
        .key("id", AttributeValue::S(entry_id.to_string()))
        .key("tenant_id", AttributeValue::S(claims.tenant_id.clone()))
        .send()
        .await;
    
    match result {
        Ok(response) => {
            if let Some(item) = response.item {
                // Check that the user owns this entry
                let user_id = match item.get("user_id") {
                    Some(AttributeValue::S(id)) => id,
                    _ => return Ok(error_response(403, &JournalError::AuthError("Not authorized to access this entry".into()))),
                };
                
                if user_id != &claims.sub {
                    return Ok(error_response(403, &JournalError::AuthError("Not authorized to access this entry".into())));
                }
                
                // Convert DynamoDB item to Entry
                let entry = Entry {
                    id: item.get("id").unwrap().as_s().unwrap().clone(),
                    title: item.get("title").unwrap().as_s().unwrap().clone(),
                    content: item.get("content").unwrap().as_s().unwrap().clone(),
                    created_at: item.get("created_at").unwrap().as_s().unwrap().clone(),
                    updated_at: item.get("updated_at").unwrap().as_s().unwrap().clone(),
                    tenant_id: item.get("tenant_id").unwrap().as_s().unwrap().clone(),
                    user_id: user_id.clone(),
                    categories: item
                        .get("categories")
                        .map(|v| v.as_ss().unwrap().clone())
                        .unwrap_or_default(),
                    tags: item.get("tags").map(|v| v.as_ss().unwrap().clone()),
                    mood: item.get("mood").map(|v| v.as_s().unwrap().clone()),
                    location: item.get("location").map(|v| v.as_s().unwrap().clone()),
                    word_count: item.get("word_count").and_then(|v| v.as_n().ok().map(|n| n.parse::<i32>().ok())),
                    sentiment_score: item
                        .get("sentiment_score")
                        .and_then(|v| v.as_n().ok().map(|n| n.parse::<f64>().ok()))
                        .flatten(),
                };
                
                Ok(json_response(200, &entry))
            } else {
                Ok(error_response(404, &JournalError::NotFoundError("Entry not found".into())))
            }
        }
        Err(e) => Ok(error_response(
            500,
            &JournalError::DatabaseError(format!("Failed to get entry: {}", e)),
        )),
    }
}

async fn list_entries(
    event: ApiGatewayProxyRequest,
) -> Result<ApiGatewayProxyResponse, Error> {
    // Extract tenant context
    let claims = match extract_tenant_context(&event.headers).await {
        Ok(claims) => claims,
        Err(e) => return Ok(error_response(401, &e)),
    };
    
    // Parse query parameters
    let query_params = serde_qs::from_str::<EntryQueryParams>(
        &event.query_string_parameters.unwrap_or_default().to_string()
    ).unwrap_or_default();
    
    // Prepare DynamoDB query
    let dynamo_client = get_dynamo_client().await;
    let table_name = std::env::var("ENTRIES_TABLE").unwrap_or_else(|_| "reflekt-entries".to_string());
    
    // Query by GSI for user's entries
    let mut query = dynamo_client
        .query()
        .table_name(table_name)
        .index_name("UserIndex")
        .key_condition_expression("tenant_id = :tenant_id AND user_id = :user_id")
        .expression_attribute_values(":tenant_id", AttributeValue::S(claims.tenant_id))
        .expression_attribute_values(":user_id", AttributeValue::S(claims.sub));
    
    // Apply category filter if provided
    if let Some(category) = &query_params.category {
        query = query
            .filter_expression("contains(categories, :category)")
            .expression_attribute_values(":category", AttributeValue::S(category.clone()));
    }
    
    // Apply date filters if provided
    if let Some(start_date) = &query_params.start_date {
        query = query
            .filter_expression("created_at >= :start_date")
            .expression_attribute_values(":start_date", AttributeValue::S(start_date.clone()));
    }
    
    if let Some(end_date) = &query_params.end_date {
        query = query
            .filter_expression("created_at <= :end_date")
            .expression_attribute_values(":end_date", AttributeValue::S(end_date.clone()));
    }
    
    // Apply pagination
    if let Some(limit) = query_params.limit {
        query = query.limit(limit);
    }
    
    if let Some(token) = &query_params.next_token {
        // Parse exclusive start key from base64
        if let Ok(decoded) = base64::decode(token) {
            if let Ok(start_key) = serde_json::from_slice(&decoded) {
                query = query.set_exclusive_start_key(Some(start_key));
            }
        }
    }
    
    // Execute query
    match query.send().await {
        Ok(response) => {
            // Convert items to entries
            let entries: Vec<Entry> = response
                .items()
                .unwrap_or_default()
                .iter()
                .map(|item| {
                    Entry {
                        id: item.get("id").unwrap().as_s().unwrap().clone(),
                        title: item.get("title").unwrap().as_s().unwrap().clone(),
                        content: item.get("content").unwrap().as_s().unwrap().clone(),
                        created_at: item.get("created_at").unwrap().as_s().unwrap().clone(),
                        updated_at: item.get("updated_at").unwrap().as_s().unwrap().clone(),
                        tenant_id: item.get("tenant_id").unwrap().as_s().unwrap().clone(),
                        user_id: item.get("user_id").unwrap().as_s().unwrap().clone(),
                        categories: item
                            .get("categories")
                            .map(|v| v.as_ss().unwrap().clone())
                            .unwrap_or_default(),
                        tags: item.get("tags").map(|v| v.as_ss().unwrap().clone()),
                        mood: item.get("mood").map(|v| v.as_s().unwrap().clone()),
                        location: item.get("location").map(|v| v.as_s().unwrap().clone()),
                        word_count: item.get("word_count").and_then(|v| v.as_n().ok().map(|n| n.parse::<i32>().ok())),
                        sentiment_score: item
                            .get("sentiment_score")
                            .and_then(|v| v.as_n().ok().map(|n| n.parse::<f64>().ok()))
                            .flatten(),
                    }
                })
                .collect();
            
            // Prepare pagination info
            let next_token = response
                .last_evaluated_key()
                .map(|key| base64::encode(serde_json::to_string(key).unwrap_or_default()));
            
            let response_body = serde_json::json!({
                "items": entries,
                "nextCursor": next_token,
            });
            
            Ok(json_response(200, &response_body))
        }
        Err(e) => Ok(error_response(
            500,
            &JournalError::DatabaseError(format!("Failed to list entries: {}", e)),
        )),
    }
}

async fn update_entry(
    event: ApiGatewayProxyRequest,
) -> Result<ApiGatewayProxyResponse, Error> {
    // Extract tenant context
    let claims = match extract_tenant_context(&event.headers).await {
        Ok(claims) => claims,
        Err(e) => return Ok(error_response(401, &e)),
    };
    
    // Get entry ID from path
    let entry_id = match event.path_parameters.get("id") {
        Some(id) => id,
        None => return Ok(error_response(400, &JournalError::ValidationError("Missing entry ID".into()))),
    };
    
    // Parse request body
    let body = event.body.ok_or_else(|| JournalError::ValidationError("Missing request body".into()))?;
    let input: UpdateEntryInput = match serde_json::from_str(&body) {
        Ok(input) => input,
        Err(e) => return Ok(error_response(400, &JournalError::ValidationError(e.to_string()))),
    };
    
    // Check if entry exists and user owns it
    let dynamo_client = get_dynamo_client().await;
    let table_name = std::env::var("ENTRIES_TABLE").unwrap_or_else(|_| "reflekt-entries".to_string());
    
    let result = dynamo_client
        .get_item()
        .table_name(&table_name)
        .key("id", AttributeValue::S(entry_id.to_string()))
        .key("tenant_id", AttributeValue::S(claims.tenant_id.clone()))
        .send()
        .await;
    
    let item = match result {
        Ok(response) => {
            match response.item {
                Some(item) => {
                    // Verify ownership
                    let user_id = match item.get("user_id") {
                        Some(AttributeValue::S(id)) => id,
                        _ => return Ok(error_response(403, &JournalError::AuthError("Not authorized to update this entry".into()))),
                    };
                    
                    if user_id != &claims.sub {
                        return Ok(error_response(403, &JournalError::AuthError("Not authorized to update this entry".into())));
                    }
                    
                    item
                }
                None => return Ok(error_response(404, &JournalError::NotFoundError("Entry not found".into()))),
            }
        }
        Err(e) => return Ok(error_response(
            500,
            &JournalError::DatabaseError(format!("Failed to fetch entry: {}", e)),
        )),
    };
    
    // Build update expression
    let timestamp = chrono::Utc::now().to_rfc3339();
    let mut update_expression = "SET updated_at = :updated_at".to_string();
    let mut expression_values = HashMap::new();
    
    expression_values.insert(
        ":updated_at".to_string(),
        AttributeValue::S(timestamp.clone()),
    );
    
    // Add title if present
    if let Some(title) = &input.title {
        update_expression.push_str(", title = :title");
        expression_values.insert(":title".to_string(), AttributeValue::S(title.clone()));
    }
    
    // Add content if present
    if let Some(content) = &input.content {
        update_expression.push_str(", content = :content");
        expression_values.insert(":content".to_string(), AttributeValue::S(content.clone()));
    }
    
    // Add categories if present
    if let Some(categories) = &input.categories {
        update_expression.push_str(", categories = :categories");
        expression_values.insert(
            ":categories".to_string(),
            AttributeValue::Ss(categories.clone()),
        );
    }
    
    // Add tags if present
    if let Some(tags) = &input.tags {
        update_expression.push_str(", tags = :tags");
        expression_values.insert(":tags".to_string(), AttributeValue::Ss(tags.clone()));
    }
    
    // Add mood if present
    if let Some(mood) = &input.mood {
        update_expression.push_str(", mood = :mood");
        expression_values.insert(":mood".to_string(), AttributeValue::S(mood.clone()));
    }
    
    // Add location if present
    if let Some(location) = &input.location {
        update_expression.push_str(", location = :location");
        expression_values.insert(":location".to_string(), AttributeValue::S(location.clone()));
    }
    
    // Update entry
    match dynamo_client
        .update_item()
        .table_name(table_name)
        .key("id", AttributeValue::S(entry_id.to_string()))
        .key("tenant_id", AttributeValue::S(claims.tenant_id.clone()))
        .update_expression(&update_expression)
        .set_expression_attribute_values(Some(expression_values))
        .return_values(aws_sdk_dynamodb::model::ReturnValue::AllNew)
        .send()
        .await
    {
        Ok(response) => {
            // Build updated entry
            let updated_item = response.attributes().unwrap();
            
            let entry = Entry {
                id: updated_item.get("id").unwrap().as_s().unwrap().clone(),
                title: updated_item.get("title").unwrap().as_s().unwrap().clone(),
                content: updated_item.get("content").unwrap().as_s().unwrap().clone(),
                created_at: updated_item.get("created_at").unwrap().as_s().unwrap().clone(),
                updated_at: updated_item.get("updated_at").unwrap().as_s().unwrap().clone(),
                tenant_id: updated_item.get("tenant_id").unwrap().as_s().unwrap().clone(),
                user_id: updated_item.get("user_id").unwrap().as_s().unwrap().clone(),
                categories: updated_item
                    .get("categories")
                    .map(|v| v.as_ss().unwrap().clone())
                    .unwrap_or_default(),
                tags: updated_item.get("tags").map(|v| v.as_ss().unwrap().clone()),
                mood: updated_item.get("mood").map(|v| v.as_s().unwrap().clone()),
                location: updated_item.get("location").map(|v| v.as_s().unwrap().clone()),
                word_count: updated_item.get("word_count").and_then(|v| v.as_n().ok().map(|n| n.parse::<i32>().ok())),
                sentiment_score: updated_item
                    .get("sentiment_score")
                    .and_then(|v| v.as_n().ok().map(|n| n.parse::<f64>().ok()))
                    .flatten(),
            };
            
            // Publish event
            let event_detail = serde_json::json!({
                "entry_id": entry_id,
                "tenant_id": claims.tenant_id,
                "user_id": claims.sub,
                "title": entry.title,
                "content": entry.content,
            });
            
            if let Err(e) = publish_event("EntryUpdated", event_detail).await {
                tracing::warn!("Failed to publish event: {}", e);
            }
            
            Ok(json_response(200, &entry))
        }
        Err(e) => Ok(error_response(
            500,
            &JournalError::DatabaseError(format!("Failed to update entry: {}", e)),
        )),
    }
}

async fn delete_entry(
    event: ApiGatewayProxyRequest,
) -> Result<ApiGatewayProxyResponse, Error> {
    // Extract tenant context
    let claims = match extract_tenant_context(&event.headers).await {
        Ok(claims) => claims,
        Err(e) => return Ok(error_response(401, &e)),
    };
    
    // Get entry ID from path
    let entry_id = match event.path_parameters.get("id") {
        Some(id) => id,
        None => return Ok(error_response(400, &JournalError::ValidationError("Missing entry ID".into()))),
    };
    
    // Check if entry exists and user owns it
    let dynamo_client = get_dynamo_client().await;
    let table_name = std::env::var("ENTRIES_TABLE").unwrap_or_else(|_| "reflekt-entries".to_string());
    
    let result = dynamo_client
        .get_item()
        .table_name(&table_name)
        .key("id", AttributeValue::S(entry_id.to_string()))
        .key("tenant_id", AttributeValue::S(claims.tenant_id.clone()))
        .send()
        .await;
    
    match result {
        Ok(response) => {
            match response.item {
                Some(item) => {
                    // Verify ownership
                    let user_id = match item.get("user_id") {
                        Some(AttributeValue::S(id)) => id,
                        _ => return Ok(error_response(403, &JournalError::AuthError("Not authorized to delete this entry".into()))),
                    };
                    
                    if user_id != &claims.sub {
                        return Ok(error_response(403, &JournalError::AuthError("Not authorized to delete this entry".into())));
                    }
                    
                    // Delete entry
                    match dynamo_client
                        .delete_item()
                        .table_name(table_name)
                        .key("id", AttributeValue::S(entry_id.to_string()))
                        .key("tenant_id", AttributeValue::S(claims.tenant_id.clone()))
                        .send()
                        .await
                    {
                        Ok(_) => {
                            // Publish event
                            let event_detail = serde_json::json!({
                                "entry_id": entry_id,
                                "tenant_id": claims.tenant_id,
                                "user_id": claims.sub,
                            });
                            
                            if let Err(e) = publish_event("EntryDeleted", event_detail).await {
                                tracing::warn!("Failed to publish event: {}", e);
                            }
                            
                            Ok(json_response(200, &serde_json::json!({ "success": true })))
                        }
                        Err(e) => Ok(error_response(
                            500,
                            &JournalError::DatabaseError(format!("Failed to delete entry: {}", e)),
                        )),
                    }
                }
                None => Ok(error_response(404, &JournalError::NotFoundError("Entry not found".into()))),
            }
        }
        Err(e) => Ok(error_response(
            500,
            &JournalError::DatabaseError(format!("Failed to fetch entry: {}", e)),
        )),
    }
}

async fn health_check(
    _event: ApiGatewayProxyRequest,
) -> Result<ApiGatewayProxyResponse, Error> {
    // Return a simple health check response
    let health_status = serde_json::json!({
        "status": "healthy",
        "service": "entry-service",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "version": env!("CARGO_PKG_VERSION"),
    });
    
    Ok(json_response(200, &health_status))
}

async fn get_entry_insights(
    dynamo_client: &aws_sdk_dynamodb::Client,
    entry_id: &str,
    tenant_id: &str,
) -> Result<ApiGatewayProxyResponse, Error> {
    // Get the insights table name from environment or use default
    let insights_table = std::env::var("INSIGHTS_TABLE").unwrap_or_else(|_| "reflekt-insights".to_string());
    
    // Query the insights table for the entry
    let result = dynamo_client
        .get_item()
        .table_name(insights_table)
        .key("entry_id", AttributeValue::S(entry_id.to_string()))
        .key("tenant_id", AttributeValue::S(tenant_id.to_string()))
        .send()
        .await;
    
    match result {
        Ok(response) => {
            if let Some(item) = response.item {
                // Convert DynamoDB item to a response object
                let mut insights = serde_json::Map::new();
                
                // Extract sentiment
                if let Some(AttributeValue::S(sentiment)) = item.get("sentiment") {
                    insights.insert("sentiment".to_string(), serde_json::Value::String(sentiment.clone()));
                }
                
                // Extract sentiment score
                if let Some(AttributeValue::N(score)) = item.get("sentiment_score") {
                    if let Ok(score_f) = score.parse::<f64>() {
                        insights.insert("sentimentScore".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(score_f).unwrap()));
                    }
                }
                
                // Extract keywords
                if let Some(AttributeValue::Ss(keywords)) = item.get("keywords") {
                    let keyword_values: Vec<serde_json::Value> = keywords
                        .iter()
                        .map(|k| serde_json::Value::String(k.clone()))
                        .collect();
                    insights.insert("keywords".to_string(), serde_json::Value::Array(keyword_values));
                }
                
                // Extract suggested categories
                if let Some(AttributeValue::Ss(categories)) = item.get("suggested_categories") {
                    let category_values: Vec<serde_json::Value> = categories
                        .iter()
                        .map(|c| serde_json::Value::String(c.clone()))
                        .collect();
                    insights.insert("suggestedCategories".to_string(), serde_json::Value::Array(category_values));
                }
                
                // Extract insights text
                if let Some(AttributeValue::S(insights_text)) = item.get("insights") {
                    insights.insert("insights".to_string(), serde_json::Value::String(insights_text.clone()));
                }
                
                // Extract reflections
                if let Some(AttributeValue::S(reflections)) = item.get("reflections") {
                    insights.insert("reflections".to_string(), serde_json::Value::String(reflections.clone()));
                }
                
                // Extract provider
                if let Some(AttributeValue::S(provider)) = item.get("provider") {
                    insights.insert("provider".to_string(), serde_json::Value::String(provider.clone()));
                }
                
                // Extract created_at
                if let Some(AttributeValue::S(created_at)) = item.get("created_at") {
                    insights.insert("createdAt".to_string(), serde_json::Value::String(created_at.clone()));
                }
                
                Ok(json_response(200, &serde_json::Value::Object(insights)))
            } else {
                // If no insights found, return empty object with 404
                Ok(json_response(404, &serde_json::json!({
                    "message": "No insights found for this entry",
                    "entryId": entry_id
                })))
            }
        },
        Err(e) => {
            // Handle error
            Err(Box::new(JournalError::DatabaseError(format!("Failed to get insights: {}", e))))
        }
    }
}

async fn handler(
    event: LambdaEvent<ApiGatewayProxyRequest>,
) -> Result<ApiGatewayProxyResponse, Error> {
    // Set up tracing
    tracing_subscriber::fmt::init();
    
    // Extract path and method for routing
    let path = event.payload.path.as_deref().unwrap_or("");
    let method = event.payload.http_method.as_deref().unwrap_or("");
    
    tracing::info!("Handling request: {} {}", method, path);
    
    // Route the request to the appropriate handler
    match (method, path) {
        // Health check endpoint
        ("GET", "/health") => health_check(event.payload).await,
        
        // Entry endpoints
        ("POST", "/entries") => create_entry(event.payload).await,
        ("GET", p) if p.starts_with("/entries/") && p.split('/').count() == 3 => {
            get_entry(event.payload).await
        }
        ("GET", "/entries") => list_entries(event.payload).await,
        ("PUT", p) if p.starts_with("/entries/") && p.split('/').count() == 3 => {
            update_entry(event.payload).await
        }
        ("DELETE", p) if p.starts_with("/entries/") && p.split('/').count() == 3 => {
            delete_entry(event.payload).await
        }
        
        // GET /entries/{id}/insights - Get AI insights for a specific entry
        ("GET", p, Some("insights")) if p.starts_with("/entries/") && p.split('/').count() == 3 => {
            // Validate user has access to this entry
            let claims = match extract_tenant_context(&event.payload.headers).await {
                Ok(claims) => claims,
                Err(e) => return Ok(error_response(401, &e)),
            };
            
            let entry_id = p.split('/').nth(2).unwrap();
            
            // Check if user has permission to access this entry
            let dynamo_client = get_dynamo_client().await;
            let entry = match get_entry_by_id(dynamo_client, entry_id, &claims.tenant_id).await {
                Ok(entry) => entry,
                Err(e) => return Ok(error_response(500, &e)),
            };
            
            if entry.user_id != claims.sub {
                return Ok(error_response(403, &JournalError::AuthorizationError("You do not have permission to access this entry's insights".into())));
            }
            
            // Get insights for the entry
            get_entry_insights(&dynamo_client, entry_id, &claims.tenant_id).await
        }
        
        // If no route matches, return 404
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
