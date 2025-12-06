use aws_lambda_events::apigw::{ApiGatewayProxyRequest, ApiGatewayProxyResponse};
use aws_sdk_dynamodb::types::AttributeValue;
use journal_common::{
    base64, chrono, error_response, extract_tenant_context, get_dynamo_client,
    json_response, lambda_runtime::{run, service_fn, Error, LambdaEvent},
    publish_event, serde_json, uuid::Uuid, JournalError,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Entry model matching the frontend interface
#[derive(Debug, Serialize, Deserialize)]
struct Entry {
    id: String,
    title: String,
    content: String,
    created_at: String,
    updated_at: String,
    #[serde(skip_serializing)]
    #[allow(dead_code)]
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

// Search parameters matching frontend SearchEntryParams
#[derive(Debug, Serialize, Deserialize, Default)]
struct SearchEntryParams {
    text: Option<String>,
    tags: Option<String>,  // comma-separated or single tag
    from_date: Option<String>,
    to_date: Option<String>,
    mood: Option<String>,
    sort_by: Option<String>,  // date_asc, date_desc, title_asc, title_desc
    limit: Option<i32>,
    page: Option<i32>,
}

// Tag count response matching frontend TagCount
#[derive(Debug, Serialize)]
struct TagCount {
    tag: String,
    count: i32,
}

// Suggest tags request
#[derive(Debug, Deserialize)]
struct SuggestTagsRequest {
    content: String,
    existing_tags: Option<Vec<String>>,
}

// Export format enum
#[derive(Debug, Clone, Copy)]
enum ExportFormat {
    Json,
    Markdown,
    Pdf,
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
                    word_count: item.get("word_count").and_then(|v| v.as_n().ok().and_then(|n| n.parse::<i32>().ok())),
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
    
    // Parse query parameters directly from QueryMap
    let query_params = EntryQueryParams {
        category: event.query_string_parameters.first("category").map(String::from),
        start_date: event.query_string_parameters.first("start_date").map(String::from),
        end_date: event.query_string_parameters.first("end_date").map(String::from),
        search_text: event.query_string_parameters.first("search_text").map(String::from),
        limit: event.query_string_parameters.first("limit").and_then(|s| s.parse().ok()),
        next_token: event.query_string_parameters.first("next_token").map(String::from),
    };
    
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
        // Parse exclusive start key from base64 - convert string map back to AttributeValue map
        use base64::Engine;
        if let Ok(decoded) = base64::engine::general_purpose::STANDARD.decode(token) {
            if let Ok(string_key) = serde_json::from_slice::<std::collections::HashMap<String, String>>(&decoded) {
                let start_key: std::collections::HashMap<String, AttributeValue> = string_key
                    .into_iter()
                    .map(|(k, v)| (k, AttributeValue::S(v)))
                    .collect();
                query = query.set_exclusive_start_key(Some(start_key));
            }
        }
    }

    // Execute query
    match query.send().await {
        Ok(response) => {
            // Convert items to entries
            let items = response.items();
            let entries: Vec<Entry> = items
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
                        word_count: item.get("word_count").and_then(|v| v.as_n().ok().and_then(|n| n.parse::<i32>().ok())),
                        sentiment_score: item
                            .get("sentiment_score")
                            .and_then(|v| v.as_n().ok().map(|n| n.parse::<f64>().ok()))
                            .flatten(),
                    }
                })
                .collect();
            
            // Prepare pagination info - convert DynamoDB key to serializable format
            use base64::Engine;
            let next_token = response.last_evaluated_key().map(|key| {
                // Convert AttributeValue map to simple string map for serialization
                let simple_key: std::collections::HashMap<String, String> = key
                    .iter()
                    .filter_map(|(k, v)| v.as_s().ok().map(|s| (k.clone(), s.clone())))
                    .collect();
                base64::engine::general_purpose::STANDARD.encode(serde_json::to_string(&simple_key).unwrap_or_default())
            });
            
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
    
    let _item = match result {
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
        .return_values(aws_sdk_dynamodb::types::ReturnValue::AllNew)
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
                word_count: updated_item.get("word_count").and_then(|v| v.as_n().ok().and_then(|n| n.parse::<i32>().ok())),
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
                        insights.insert("sentiment_score".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(score_f).unwrap()));
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
                    insights.insert("suggested_categories".to_string(), serde_json::Value::Array(category_values));
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
                    insights.insert("created_at".to_string(), serde_json::Value::String(created_at.clone()));
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

// Search entries with full-text search and filters
async fn search_entries(
    event: ApiGatewayProxyRequest,
) -> Result<ApiGatewayProxyResponse, Error> {
    // Extract tenant context
    let claims = match extract_tenant_context(&event.headers).await {
        Ok(claims) => claims,
        Err(e) => return Ok(error_response(401, &e)),
    };

    // Parse search parameters from query string
    let params = SearchEntryParams {
        text: event.query_string_parameters.first("text").map(String::from),
        tags: event.query_string_parameters.first("tags").map(String::from),
        from_date: event.query_string_parameters.first("from_date").map(String::from),
        to_date: event.query_string_parameters.first("to_date").map(String::from),
        mood: event.query_string_parameters.first("mood").map(String::from),
        sort_by: event.query_string_parameters.first("sort_by").map(String::from),
        limit: event.query_string_parameters.first("limit").and_then(|s| s.parse().ok()),
        page: event.query_string_parameters.first("page").and_then(|s| s.parse().ok()),
    };

    let dynamo_client = get_dynamo_client().await;
    let table_name = std::env::var("ENTRIES_TABLE").unwrap_or_else(|_| "reflekt-entries".to_string());

    // Build filter expression components
    let mut filter_parts: Vec<String> = Vec::new();
    let mut expression_values: HashMap<String, AttributeValue> = HashMap::new();
    let mut expression_names: HashMap<String, String> = HashMap::new();

    // Add user filter (always required)
    expression_values.insert(":tenant_id".to_string(), AttributeValue::S(claims.tenant_id.clone()));
    expression_values.insert(":user_id".to_string(), AttributeValue::S(claims.sub.clone()));

    // Text search (searches in title and content)
    if let Some(text) = &params.text {
        if !text.is_empty() {
            let search_lower = text.to_lowercase();
            filter_parts.push("(contains(#title_lower, :search_text) OR contains(#content_lower, :search_text))".to_string());
            expression_values.insert(":search_text".to_string(), AttributeValue::S(search_lower));
            expression_names.insert("#title_lower".to_string(), "title".to_string());
            expression_names.insert("#content_lower".to_string(), "content".to_string());
        }
    }

    // Tags filter
    if let Some(tags_str) = &params.tags {
        let tags: Vec<&str> = tags_str.split(',').map(|s| s.trim()).filter(|s| !s.is_empty()).collect();
        for (i, tag) in tags.iter().enumerate() {
            filter_parts.push(format!("contains(tags, :tag{})", i));
            expression_values.insert(format!(":tag{}", i), AttributeValue::S(tag.to_string()));
        }
    }

    // Date range filter
    if let Some(from_date) = &params.from_date {
        filter_parts.push("created_at >= :from_date".to_string());
        expression_values.insert(":from_date".to_string(), AttributeValue::S(from_date.clone()));
    }

    if let Some(to_date) = &params.to_date {
        filter_parts.push("created_at <= :to_date".to_string());
        expression_values.insert(":to_date".to_string(), AttributeValue::S(to_date.clone()));
    }

    // Mood filter
    if let Some(mood) = &params.mood {
        filter_parts.push("mood = :mood".to_string());
        expression_values.insert(":mood".to_string(), AttributeValue::S(mood.clone()));
    }

    // Build the query
    let mut query = dynamo_client
        .query()
        .table_name(table_name)
        .index_name("UserIndex")
        .key_condition_expression("tenant_id = :tenant_id AND user_id = :user_id");

    // Add filter expression if there are filters
    if !filter_parts.is_empty() {
        query = query.filter_expression(filter_parts.join(" AND "));
    }

    // Add expression attribute values
    for (k, v) in expression_values {
        query = query.expression_attribute_values(k, v);
    }

    // Add expression attribute names if needed
    if !expression_names.is_empty() {
        for (k, v) in expression_names {
            query = query.expression_attribute_names(k, v);
        }
    }

    // Apply pagination
    let limit = params.limit.unwrap_or(20).min(100);
    let page = params.page.unwrap_or(1).max(1);

    // For pagination, we need to scan through pages
    // DynamoDB doesn't support offset-based pagination natively
    query = query.limit(limit * page);

    // Execute query
    match query.send().await {
        Ok(response) => {
            let items = response.items();

            // Convert items to entries
            let mut entries: Vec<Entry> = items
                .iter()
                .map(|item| Entry {
                    id: item.get("id").and_then(|v| v.as_s().ok()).cloned().unwrap_or_default(),
                    title: item.get("title").and_then(|v| v.as_s().ok()).cloned().unwrap_or_default(),
                    content: item.get("content").and_then(|v| v.as_s().ok()).cloned().unwrap_or_default(),
                    created_at: item.get("created_at").and_then(|v| v.as_s().ok()).cloned().unwrap_or_default(),
                    updated_at: item.get("updated_at").and_then(|v| v.as_s().ok()).cloned().unwrap_or_default(),
                    tenant_id: item.get("tenant_id").and_then(|v| v.as_s().ok()).cloned().unwrap_or_default(),
                    user_id: item.get("user_id").and_then(|v| v.as_s().ok()).cloned().unwrap_or_default(),
                    categories: item.get("categories").and_then(|v| v.as_ss().ok()).cloned().unwrap_or_default(),
                    tags: item.get("tags").and_then(|v| v.as_ss().ok()).cloned(),
                    mood: item.get("mood").and_then(|v| v.as_s().ok()).cloned(),
                    location: item.get("location").and_then(|v| v.as_s().ok()).cloned(),
                    word_count: item.get("word_count").and_then(|v| v.as_n().ok().and_then(|n| n.parse().ok())),
                    sentiment_score: item.get("sentiment_score").and_then(|v| v.as_n().ok().and_then(|n| n.parse().ok())),
                })
                .collect();

            // Apply sorting
            if let Some(sort_by) = &params.sort_by {
                match sort_by.as_str() {
                    "date_asc" => entries.sort_by(|a, b| a.created_at.cmp(&b.created_at)),
                    "date_desc" => entries.sort_by(|a, b| b.created_at.cmp(&a.created_at)),
                    "title_asc" => entries.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase())),
                    "title_desc" => entries.sort_by(|a, b| b.title.to_lowercase().cmp(&a.title.to_lowercase())),
                    _ => entries.sort_by(|a, b| b.created_at.cmp(&a.created_at)), // default: date_desc
                }
            } else {
                entries.sort_by(|a, b| b.created_at.cmp(&a.created_at)); // default: date_desc
            }

            // Apply pagination (skip to correct page)
            let start_index = ((page - 1) * limit) as usize;
            let paginated_entries: Vec<Entry> = entries.into_iter().skip(start_index).take(limit as usize).collect();

            let response_body = serde_json::json!({
                "items": paginated_entries,
                "page": page,
                "limit": limit,
            });

            Ok(json_response(200, &response_body))
        }
        Err(e) => Ok(error_response(
            500,
            &JournalError::DatabaseError(format!("Failed to search entries: {}", e)),
        )),
    }
}

// Export entries in various formats
async fn export_entries(
    event: ApiGatewayProxyRequest,
) -> Result<ApiGatewayProxyResponse, Error> {
    // Extract tenant context
    let claims = match extract_tenant_context(&event.headers).await {
        Ok(claims) => claims,
        Err(e) => return Ok(error_response(401, &e)),
    };

    // Get format from query parameters
    let format_str = event.query_string_parameters.first("format").unwrap_or("json");
    let format = match format_str.to_lowercase().as_str() {
        "json" => ExportFormat::Json,
        "markdown" | "md" => ExportFormat::Markdown,
        "pdf" => ExportFormat::Pdf,
        _ => return Ok(error_response(400, &JournalError::ValidationError(
            "Invalid format. Supported formats: json, markdown, pdf".into()
        ))),
    };

    // Fetch all entries for the user
    let dynamo_client = get_dynamo_client().await;
    let table_name = std::env::var("ENTRIES_TABLE").unwrap_or_else(|_| "reflekt-entries".to_string());

    let result = dynamo_client
        .query()
        .table_name(table_name)
        .index_name("UserIndex")
        .key_condition_expression("tenant_id = :tenant_id AND user_id = :user_id")
        .expression_attribute_values(":tenant_id", AttributeValue::S(claims.tenant_id.clone()))
        .expression_attribute_values(":user_id", AttributeValue::S(claims.sub.clone()))
        .send()
        .await;

    match result {
        Ok(response) => {
            let items = response.items();
            let entries: Vec<Entry> = items
                .iter()
                .map(|item| Entry {
                    id: item.get("id").and_then(|v| v.as_s().ok()).cloned().unwrap_or_default(),
                    title: item.get("title").and_then(|v| v.as_s().ok()).cloned().unwrap_or_default(),
                    content: item.get("content").and_then(|v| v.as_s().ok()).cloned().unwrap_or_default(),
                    created_at: item.get("created_at").and_then(|v| v.as_s().ok()).cloned().unwrap_or_default(),
                    updated_at: item.get("updated_at").and_then(|v| v.as_s().ok()).cloned().unwrap_or_default(),
                    tenant_id: item.get("tenant_id").and_then(|v| v.as_s().ok()).cloned().unwrap_or_default(),
                    user_id: item.get("user_id").and_then(|v| v.as_s().ok()).cloned().unwrap_or_default(),
                    categories: item.get("categories").and_then(|v| v.as_ss().ok()).cloned().unwrap_or_default(),
                    tags: item.get("tags").and_then(|v| v.as_ss().ok()).cloned(),
                    mood: item.get("mood").and_then(|v| v.as_s().ok()).cloned(),
                    location: item.get("location").and_then(|v| v.as_s().ok()).cloned(),
                    word_count: item.get("word_count").and_then(|v| v.as_n().ok().and_then(|n| n.parse().ok())),
                    sentiment_score: item.get("sentiment_score").and_then(|v| v.as_n().ok().and_then(|n| n.parse().ok())),
                })
                .collect();

            // Generate export content based on format
            match format {
                ExportFormat::Json => {
                    let json_content = serde_json::to_string_pretty(&entries).unwrap_or_default();

                    let mut headers = aws_lambda_events::http::HeaderMap::new();
                    headers.insert("content-type", "application/json".parse().unwrap());
                    headers.insert("content-disposition", "attachment; filename=\"journal-entries.json\"".parse().unwrap());

                    Ok(ApiGatewayProxyResponse {
                        status_code: 200,
                        headers,
                        multi_value_headers: Default::default(),
                        body: Some(aws_lambda_events::encodings::Body::Text(json_content)),
                        is_base64_encoded: false,
                    })
                }
                ExportFormat::Markdown => {
                    let mut markdown = String::from("# Journal Entries\n\n");
                    markdown.push_str(&format!("Exported on: {}\n\n", chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC")));
                    markdown.push_str("---\n\n");

                    for entry in entries {
                        markdown.push_str(&format!("## {}\n\n", entry.title));
                        markdown.push_str(&format!("**Date:** {}\n\n", entry.created_at));

                        if let Some(mood) = &entry.mood {
                            markdown.push_str(&format!("**Mood:** {}\n\n", mood));
                        }

                        if let Some(tags) = &entry.tags {
                            if !tags.is_empty() {
                                markdown.push_str(&format!("**Tags:** {}\n\n", tags.join(", ")));
                            }
                        }

                        markdown.push_str(&format!("{}\n\n", entry.content));
                        markdown.push_str("---\n\n");
                    }

                    let mut headers = aws_lambda_events::http::HeaderMap::new();
                    headers.insert("content-type", "text/markdown; charset=utf-8".parse().unwrap());
                    headers.insert("content-disposition", "attachment; filename=\"journal-entries.md\"".parse().unwrap());

                    Ok(ApiGatewayProxyResponse {
                        status_code: 200,
                        headers,
                        multi_value_headers: Default::default(),
                        body: Some(aws_lambda_events::encodings::Body::Text(markdown)),
                        is_base64_encoded: false,
                    })
                }
                ExportFormat::Pdf => {
                    // For PDF, we return a simple text representation
                    // In production, you'd use a PDF generation library or service
                    let mut content = String::from("JOURNAL ENTRIES EXPORT\n");
                    content.push_str(&format!("Exported: {}\n", chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC")));
                    content.push_str(&"=".repeat(50));
                    content.push_str("\n\n");

                    for entry in entries {
                        content.push_str(&format!("TITLE: {}\n", entry.title));
                        content.push_str(&format!("DATE: {}\n", entry.created_at));

                        if let Some(mood) = &entry.mood {
                            content.push_str(&format!("MOOD: {}\n", mood));
                        }

                        if let Some(tags) = &entry.tags {
                            if !tags.is_empty() {
                                content.push_str(&format!("TAGS: {}\n", tags.join(", ")));
                            }
                        }

                        content.push_str("\n");
                        content.push_str(&entry.content);
                        content.push_str("\n\n");
                        content.push_str(&"-".repeat(50));
                        content.push_str("\n\n");
                    }

                    let mut headers = aws_lambda_events::http::HeaderMap::new();
                    headers.insert("content-type", "text/plain; charset=utf-8".parse().unwrap());
                    headers.insert("content-disposition", "attachment; filename=\"journal-entries.txt\"".parse().unwrap());

                    Ok(ApiGatewayProxyResponse {
                        status_code: 200,
                        headers,
                        multi_value_headers: Default::default(),
                        body: Some(aws_lambda_events::encodings::Body::Text(content)),
                        is_base64_encoded: false,
                    })
                }
            }
        }
        Err(e) => Ok(error_response(
            500,
            &JournalError::DatabaseError(format!("Failed to fetch entries for export: {}", e)),
        )),
    }
}

// Get all tags with counts for the user
async fn get_tags(
    event: ApiGatewayProxyRequest,
) -> Result<ApiGatewayProxyResponse, Error> {
    // Extract tenant context
    let claims = match extract_tenant_context(&event.headers).await {
        Ok(claims) => claims,
        Err(e) => return Ok(error_response(401, &e)),
    };

    let dynamo_client = get_dynamo_client().await;
    let table_name = std::env::var("ENTRIES_TABLE").unwrap_or_else(|_| "reflekt-entries".to_string());

    // Query all entries for the user to aggregate tags
    let result = dynamo_client
        .query()
        .table_name(table_name)
        .index_name("UserIndex")
        .key_condition_expression("tenant_id = :tenant_id AND user_id = :user_id")
        .expression_attribute_values(":tenant_id", AttributeValue::S(claims.tenant_id.clone()))
        .expression_attribute_values(":user_id", AttributeValue::S(claims.sub.clone()))
        .projection_expression("tags")
        .send()
        .await;

    match result {
        Ok(response) => {
            // Aggregate tag counts
            let mut tag_counts: HashMap<String, i32> = HashMap::new();

            for item in response.items() {
                if let Some(tags) = item.get("tags").and_then(|v| v.as_ss().ok()) {
                    for tag in tags {
                        *tag_counts.entry(tag.clone()).or_insert(0) += 1;
                    }
                }
            }

            // Convert to TagCount structs
            let mut tags: Vec<TagCount> = tag_counts
                .into_iter()
                .map(|(tag, count)| TagCount { tag, count })
                .collect();

            // Sort by count descending, then alphabetically
            tags.sort_by(|a, b| {
                b.count.cmp(&a.count).then_with(|| a.tag.cmp(&b.tag))
            });

            Ok(json_response(200, &tags))
        }
        Err(e) => Ok(error_response(
            500,
            &JournalError::DatabaseError(format!("Failed to get tags: {}", e)),
        )),
    }
}

// Suggest tags based on content using simple keyword extraction
async fn suggest_tags(
    event: ApiGatewayProxyRequest,
) -> Result<ApiGatewayProxyResponse, Error> {
    // Extract tenant context
    let claims = match extract_tenant_context(&event.headers).await {
        Ok(claims) => claims,
        Err(e) => return Ok(error_response(401, &e)),
    };

    // Parse request body
    let body = match &event.body {
        Some(b) => b,
        None => return Ok(error_response(400, &JournalError::ValidationError("Missing request body".into()))),
    };

    let request: SuggestTagsRequest = match serde_json::from_str(body) {
        Ok(req) => req,
        Err(e) => return Ok(error_response(400, &JournalError::ValidationError(e.to_string()))),
    };

    let existing_tags: Vec<String> = request.existing_tags.unwrap_or_default();

    // Get user's existing tags to suggest from their vocabulary
    let dynamo_client = get_dynamo_client().await;
    let table_name = std::env::var("ENTRIES_TABLE").unwrap_or_else(|_| "reflekt-entries".to_string());

    let result = dynamo_client
        .query()
        .table_name(table_name)
        .index_name("UserIndex")
        .key_condition_expression("tenant_id = :tenant_id AND user_id = :user_id")
        .expression_attribute_values(":tenant_id", AttributeValue::S(claims.tenant_id.clone()))
        .expression_attribute_values(":user_id", AttributeValue::S(claims.sub.clone()))
        .projection_expression("tags")
        .send()
        .await;

    // Collect all user's tags
    let user_tags: Vec<String> = match result {
        Ok(response) => {
            let mut all_tags: Vec<String> = Vec::new();
            for item in response.items() {
                if let Some(tags) = item.get("tags").and_then(|v| v.as_ss().ok()) {
                    all_tags.extend(tags.iter().cloned());
                }
            }
            all_tags
        }
        Err(_) => Vec::new(),
    };

    // Extract keywords from content
    let content_lower = request.content.to_lowercase();
    let words: Vec<&str> = content_lower
        .split(|c: char| !c.is_alphanumeric())
        .filter(|w| w.len() > 3)
        .collect();

    // Common stop words to filter out
    let stop_words: std::collections::HashSet<&str> = [
        "the", "and", "for", "are", "but", "not", "you", "all", "can", "had",
        "her", "was", "one", "our", "out", "day", "get", "has", "him", "his",
        "how", "its", "may", "new", "now", "old", "see", "way", "who", "boy",
        "did", "own", "say", "she", "too", "use", "that", "with", "have", "this",
        "will", "your", "from", "they", "been", "call", "come", "each", "find",
        "long", "make", "many", "more", "than", "time", "very", "when", "what",
        "which", "would", "about", "could", "other", "their", "there", "these",
        "think", "thought", "today", "really", "feeling", "feel", "just", "like",
        "want", "know", "going", "things", "being", "something", "always",
    ].iter().cloned().collect();

    // Count word frequencies
    let mut word_freq: HashMap<String, i32> = HashMap::new();
    for word in words {
        if !stop_words.contains(word) {
            *word_freq.entry(word.to_string()).or_insert(0) += 1;
        }
    }

    // Get top keywords
    let mut keywords: Vec<(String, i32)> = word_freq.into_iter().collect();
    keywords.sort_by(|a, b| b.1.cmp(&a.1));

    let mut suggested_tags: Vec<String> = Vec::new();

    // First, check if any user's existing tags match content
    for user_tag in &user_tags {
        let tag_lower = user_tag.to_lowercase();
        if content_lower.contains(&tag_lower) && !existing_tags.contains(user_tag) && !suggested_tags.contains(user_tag) {
            suggested_tags.push(user_tag.clone());
            if suggested_tags.len() >= 5 {
                break;
            }
        }
    }

    // Then add top keywords as suggestions
    for (keyword, _) in keywords.iter().take(10) {
        if !existing_tags.iter().any(|t| t.to_lowercase() == *keyword)
            && !suggested_tags.iter().any(|t| t.to_lowercase() == *keyword)
            && suggested_tags.len() < 5
        {
            suggested_tags.push(keyword.clone());
        }
    }

    Ok(json_response(200, &suggested_tags))
}

async fn handler(
    event: LambdaEvent<ApiGatewayProxyRequest>,
) -> Result<ApiGatewayProxyResponse, Error> {
    // Extract path and method for routing
    let path = event.payload.path.as_deref().unwrap_or("");
    let method = event.payload.http_method.as_str();
    
    tracing::info!("Handling request: {} {}", method, path);
    
    // Route the request to the appropriate handler
    match (method, path) {
        // Health check endpoint
        ("GET", "/health") => health_check(event.payload).await,

        // Search entries - must be before generic /entries/{id} route
        ("GET", "/entries/search") => search_entries(event.payload).await,

        // Export entries
        ("GET", "/entries/export") => export_entries(event.payload).await,

        // Get all tags with counts
        ("GET", "/entries/tags") => get_tags(event.payload).await,

        // Suggest tags for content
        ("POST", "/entries/suggest-tags") => suggest_tags(event.payload).await,

        // Entry CRUD endpoints
        ("POST", "/entries") => create_entry(event.payload).await,
        ("GET", "/entries") => list_entries(event.payload).await,

        // GET /entries/{id}/insights - Get AI insights for a specific entry
        ("GET", p) if p.starts_with("/entries/") && p.ends_with("/insights") => {
            // Validate user has access to this entry
            let claims = match extract_tenant_context(&event.payload.headers).await {
                Ok(claims) => claims,
                Err(e) => return Ok(error_response(401, &e)),
            };

            // Extract entry_id from path like /entries/{id}/insights
            let parts: Vec<&str> = p.split('/').collect();
            if parts.len() != 4 {
                return Ok(error_response(400, &JournalError::ValidationError("Invalid path".into())));
            }
            let entry_id = parts[2];

            // Check if user has permission to access this entry
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
                    if let Some(item) = response.item {
                        // Check that the user owns this entry
                        let user_id = match item.get("user_id") {
                            Some(AttributeValue::S(id)) => id,
                            _ => return Ok(error_response(403, &JournalError::AuthorizationError("Not authorized to access this entry".into()))),
                        };

                        if user_id != &claims.sub {
                            return Ok(error_response(403, &JournalError::AuthorizationError("You do not have permission to access this entry's insights".into())));
                        }

                        // Get insights for the entry
                        get_entry_insights(&dynamo_client, entry_id, &claims.tenant_id).await
                    } else {
                        Ok(error_response(404, &JournalError::NotFoundError("Entry not found".into())))
                    }
                }
                Err(e) => Ok(error_response(500, &JournalError::DatabaseError(format!("Failed to fetch entry: {}", e)))),
            }
        }

        // GET /entries/{id} - Get single entry
        ("GET", p) if p.starts_with("/entries/") && p.split('/').count() == 3 => {
            get_entry(event.payload).await
        }

        // PUT /entries/{id} - Update entry
        ("PUT", p) if p.starts_with("/entries/") && p.split('/').count() == 3 => {
            update_entry(event.payload).await
        }

        // DELETE /entries/{id} - Delete entry
        ("DELETE", p) if p.starts_with("/entries/") && p.split('/').count() == 3 => {
            delete_entry(event.payload).await
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
    // Set up tracing - only called once during Lambda cold start
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_target(false)
        .without_time()
        .init();

    run(service_fn(handler)).await
}
