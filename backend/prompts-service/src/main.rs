use aws_lambda_events::encodings::Body;
use aws_lambda_events::http::{HeaderMap, Method};
use aws_sdk_dynamodb::types::AttributeValue;
use common::auth::{get_user_from_event, AuthError};
use common::db::{dynamodb_client, DbError};
use common::http::{create_response, error_response, Response, StatusCode};
use lambda_http::{run, service_fn, Error, IntoResponse, Request};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::{error, info};
use uuid::Uuid;

const PROMPTS_TABLE: &str = "PROMPTS_TABLE";

#[derive(Debug, Serialize, Deserialize)]
struct Prompt {
    id: String,
    text: String,
    category: String,
    created_at: String,
    tags: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
struct PromptResponse {
    prompt: Prompt,
}

#[derive(Debug, Serialize)]
struct PromptsResponse {
    prompts: Vec<Prompt>,
}

#[derive(Debug, Deserialize)]
struct CreatePromptRequest {
    text: String,
    category: String,
    tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct UpdatePromptRequest {
    text: Option<String>,
    category: Option<String>,
    tags: Option<Vec<String>>,
}

async fn handle_request(event: Request) -> Result<impl IntoResponse, Error> {
    info!("Received request: {:?}", event);

    // Extract path and parts
    let path = event.uri().path();
    let path_parts: Vec<&str> = path.split('/').collect();

    // Extract HTTP method
    let method = event.method();

    // Authenticate user
    let user = match get_user_from_event(&event) {
        Ok(user) => user,
        Err(e) => {
            error!("Authentication error: {:?}", e);
            return match e {
                AuthError::InvalidToken => Ok(error_response(
                    StatusCode::UNAUTHORIZED,
                    "Invalid token".to_string(),
                )),
                AuthError::MissingToken => Ok(error_response(
                    StatusCode::UNAUTHORIZED,
                    "Missing token".to_string(),
                )),
                _ => Ok(error_response(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Internal server error".to_string(),
                )),
            };
        }
    };

    info!("Authenticated user: {:?}", user);

    // Get DynamoDB client
    let client = match dynamodb_client().await {
        Ok(client) => client,
        Err(e) => {
            error!("Error creating DynamoDB client: {:?}", e);
            return Ok(error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to connect to database".to_string(),
            ));
        }
    };

    // Route request based on path and method
    match (method, path_parts.get(1), path_parts.get(2)) {
        // GET /prompts - List all prompts
        (method, Some(&"prompts"), None) if method == &Method::GET => {
            list_prompts(client).await
        }

        // GET /prompts/daily - Get daily prompt
        (method, Some(&"prompts"), Some(&"daily")) if method == &Method::GET => {
            get_daily_prompt(client).await
        }

        // GET /prompts/random - Get random prompt
        (method, Some(&"prompts"), Some(&"random")) if method == &Method::GET => {
            get_random_prompt(client).await
        }

        // GET /prompts/category/{category} - Get prompts by category
        (method, Some(&"prompts"), Some(&"category")) if method == &Method::GET => {
            if let Some(category) = path_parts.get(3) {
                get_prompts_by_category(client, category).await
            } else {
                Ok(error_response(
                    StatusCode::BAD_REQUEST,
                    "Category is required".to_string(),
                ))
            }
        }

        // GET /prompts/{id} - Get prompt by ID
        (method, Some(&"prompts"), Some(id)) if method == &Method::GET => {
            get_prompt_by_id(client, id).await
        }

        // POST /prompts - Create a new prompt (admin only)
        (method, Some(&"prompts"), None) if method == &Method::POST => {
            // Check if user is admin
            if !user.is_admin {
                return Ok(error_response(
                    StatusCode::FORBIDDEN,
                    "Admin privileges required".to_string(),
                ));
            }

            let body = match event.body() {
                Body::Text(text) => text.clone(),
                Body::Binary(bin) => String::from_utf8_lossy(bin).to_string(),
                _ => {
                    return Ok(error_response(
                        StatusCode::BAD_REQUEST,
                        "Invalid request body".to_string(),
                    ))
                }
            };

            let prompt_request: CreatePromptRequest = match serde_json::from_str(&body) {
                Ok(req) => req,
                Err(e) => {
                    error!("Error parsing request: {:?}", e);
                    return Ok(error_response(
                        StatusCode::BAD_REQUEST,
                        "Invalid request format".to_string(),
                    ));
                }
            };

            create_prompt(client, prompt_request).await
        }

        // PUT /prompts/{id} - Update a prompt (admin only)
        (method, Some(&"prompts"), Some(id)) if method == &Method::PUT => {
            // Check if user is admin
            if !user.is_admin {
                return Ok(error_response(
                    StatusCode::FORBIDDEN,
                    "Admin privileges required".to_string(),
                ));
            }

            let body = match event.body() {
                Body::Text(text) => text.clone(),
                Body::Binary(bin) => String::from_utf8_lossy(bin).to_string(),
                _ => {
                    return Ok(error_response(
                        StatusCode::BAD_REQUEST,
                        "Invalid request body".to_string(),
                    ))
                }
            };

            let update_request: UpdatePromptRequest = match serde_json::from_str(&body) {
                Ok(req) => req,
                Err(e) => {
                    error!("Error parsing request: {:?}", e);
                    return Ok(error_response(
                        StatusCode::BAD_REQUEST,
                        "Invalid request format".to_string(),
                    ));
                }
            };

            update_prompt(client, id, update_request).await
        }

        // DELETE /prompts/{id} - Delete a prompt (admin only)
        (method, Some(&"prompts"), Some(id)) if method == &Method::DELETE => {
            // Check if user is admin
            if !user.is_admin {
                return Ok(error_response(
                    StatusCode::FORBIDDEN,
                    "Admin privileges required".to_string(),
                ));
            }

            delete_prompt(client, id).await
        }

        // Not found
        _ => Ok(error_response(
            StatusCode::NOT_FOUND,
            "Endpoint not found".to_string(),
        )),
    }
}

async fn get_prompt_by_id(
    client: aws_sdk_dynamodb::Client,
    id: &str,
) -> Result<Response, Error> {
    let table_name = std::env::var(PROMPTS_TABLE).expect("PROMPTS_TABLE must be set");

    // Get prompt from DynamoDB
    let result = client
        .get_item()
        .table_name(table_name)
        .key("id", AttributeValue::S(id.to_string()))
        .send()
        .await;

    match result {
        Ok(response) => match response.item {
            Some(item) => {
                let prompt = item_to_prompt(item)?;
                Ok(create_response(
                    StatusCode::OK,
                    serde_json::to_string(&PromptResponse { prompt })?,
                ))
            }
            None => Ok(error_response(
                StatusCode::NOT_FOUND,
                format!("Prompt with id {} not found", id),
            )),
        },
        Err(e) => {
            error!("Error getting prompt: {:?}", e);
            Ok(error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to get prompt".to_string(),
            ))
        }
    }
}

async fn get_daily_prompt(client: aws_sdk_dynamodb::Client) -> Result<Response, Error> {
    let table_name = std::env::var(PROMPTS_TABLE).expect("PROMPTS_TABLE must be set");

    // For simplicity, we'll just get a random prompt
    // In a production app, you might want to:
    // 1. Maintain a separate "daily prompt" record that is updated each day
    // 2. Use current date to deterministically select a prompt
    let result = client
        .scan()
        .table_name(table_name)
        .limit(100)
        .send()
        .await;

    match result {
        Ok(response) => {
            if let Some(items) = response.items {
                if items.is_empty() {
                    return Ok(error_response(
                        StatusCode::NOT_FOUND,
                        "No prompts available".to_string(),
                    ));
                }

                // Use today's date to deterministically pick a prompt
                let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
                let seed = today.bytes().fold(0u64, |acc, b| acc + b as u64);
                let index = (seed % items.len() as u64) as usize;
                
                let item = &items[index];
                let prompt = item_to_prompt(item.clone())?;
                
                Ok(create_response(
                    StatusCode::OK,
                    serde_json::to_string(&PromptResponse { prompt })?,
                ))
            } else {
                Ok(error_response(
                    StatusCode::NOT_FOUND,
                    "No prompts available".to_string(),
                ))
            }
        }
        Err(e) => {
            error!("Error getting prompts: {:?}", e);
            Ok(error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to get daily prompt".to_string(),
            ))
        }
    }
}

async fn get_random_prompt(client: aws_sdk_dynamodb::Client) -> Result<Response, Error> {
    let table_name = std::env::var(PROMPTS_TABLE).expect("PROMPTS_TABLE must be set");

    // Get all prompts
    let result = client
        .scan()
        .table_name(table_name)
        .limit(100)
        .send()
        .await;

    match result {
        Ok(response) => {
            if let Some(items) = response.items {
                if items.is_empty() {
                    return Ok(error_response(
                        StatusCode::NOT_FOUND,
                        "No prompts available".to_string(),
                    ));
                }

                // Get a random index
                use rand::{SeedableRng, Rng, rngs::StdRng};
                let seed = chrono::Utc::now().timestamp_nanos() as u64;
                let mut rng = StdRng::seed_from_u64(seed);
                let index = rng.gen_range(0..items.len());
                
                let item = &items[index];
                let prompt = item_to_prompt(item.clone())?;
                
                Ok(create_response(
                    StatusCode::OK,
                    serde_json::to_string(&PromptResponse { prompt })?,
                ))
            } else {
                Ok(error_response(
                    StatusCode::NOT_FOUND,
                    "No prompts available".to_string(),
                ))
            }
        }
        Err(e) => {
            error!("Error getting prompts: {:?}", e);
            Ok(error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to get random prompt".to_string(),
            ))
        }
    }
}

async fn get_prompts_by_category(
    client: aws_sdk_dynamodb::Client,
    category: &str,
) -> Result<Response, Error> {
    let table_name = std::env::var(PROMPTS_TABLE).expect("PROMPTS_TABLE must be set");

    // Query prompts by category using a GSI
    let result = client
        .query()
        .table_name(table_name)
        .index_name("category-index")
        .key_condition_expression("category = :category")
        .expression_attribute_values(":category", AttributeValue::S(category.to_string()))
        .send()
        .await;

    match result {
        Ok(response) => {
            if let Some(items) = response.items {
                let mut prompts = Vec::new();
                for item in items {
                    let prompt = item_to_prompt(item)?;
                    prompts.push(prompt);
                }
                
                Ok(create_response(
                    StatusCode::OK,
                    serde_json::to_string(&PromptsResponse { prompts })?,
                ))
            } else {
                Ok(error_response(
                    StatusCode::NOT_FOUND,
                    format!("No prompts found for category: {}", category),
                ))
            }
        }
        Err(e) => {
            error!("Error getting prompts by category: {:?}", e);
            Ok(error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to get prompts by category".to_string(),
            ))
        }
    }
}

async fn list_prompts(client: aws_sdk_dynamodb::Client) -> Result<Response, Error> {
    let table_name = std::env::var(PROMPTS_TABLE).expect("PROMPTS_TABLE must be set");

    // Scan all prompts
    let result = client
        .scan()
        .table_name(table_name)
        .send()
        .await;

    match result {
        Ok(response) => {
            if let Some(items) = response.items {
                let mut prompts = Vec::new();
                for item in items {
                    let prompt = item_to_prompt(item)?;
                    prompts.push(prompt);
                }
                
                Ok(create_response(
                    StatusCode::OK,
                    serde_json::to_string(&PromptsResponse { prompts })?,
                ))
            } else {
                Ok(create_response(
                    StatusCode::OK,
                    serde_json::to_string(&PromptsResponse { prompts: Vec::new() })?,
                ))
            }
        }
        Err(e) => {
            error!("Error listing prompts: {:?}", e);
            Ok(error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to list prompts".to_string(),
            ))
        }
    }
}

async fn create_prompt(
    client: aws_sdk_dynamodb::Client,
    request: CreatePromptRequest,
) -> Result<Response, Error> {
    let table_name = std::env::var(PROMPTS_TABLE).expect("PROMPTS_TABLE must be set");

    // Create a new prompt
    let now = chrono::Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    let mut item = HashMap::new();
    item.insert("id".to_string(), AttributeValue::S(id.clone()));
    item.insert("text".to_string(), AttributeValue::S(request.text));
    item.insert("category".to_string(), AttributeValue::S(request.category));
    item.insert("created_at".to_string(), AttributeValue::S(now));

    if let Some(tags) = request.tags {
        let tag_values: Vec<AttributeValue> = tags.iter()
            .map(|tag| AttributeValue::S(tag.clone()))
            .collect();
        item.insert("tags".to_string(), AttributeValue::L(tag_values));
    }

    // Put item in DynamoDB
    let result = client
        .put_item()
        .table_name(table_name)
        .set_item(Some(item))
        .send()
        .await;

    match result {
        Ok(_) => {
            // Fetch the created prompt to return it
            get_prompt_by_id(client, &id).await
        }
        Err(e) => {
            error!("Error creating prompt: {:?}", e);
            Ok(error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to create prompt".to_string(),
            ))
        }
    }
}

async fn update_prompt(
    client: aws_sdk_dynamodb::Client,
    id: &str,
    request: UpdatePromptRequest,
) -> Result<Response, Error> {
    let table_name = std::env::var(PROMPTS_TABLE).expect("PROMPTS_TABLE must be set");

    // Check if prompt exists
    let get_result = client
        .get_item()
        .table_name(&table_name)
        .key("id", AttributeValue::S(id.to_string()))
        .send()
        .await;

    match get_result {
        Ok(response) => {
            if response.item.is_none() {
                return Ok(error_response(
                    StatusCode::NOT_FOUND,
                    format!("Prompt with id {} not found", id),
                ));
            }
        }
        Err(e) => {
            error!("Error checking prompt existence: {:?}", e);
            return Ok(error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to check prompt existence".to_string(),
            ));
        }
    }

    // Build update expression and attribute values
    let mut update_expression = String::from("SET ");
    let mut expression_attribute_values = HashMap::new();
    let mut attributes_updated = false;

    if let Some(text) = request.text {
        update_expression.push_str("#txt = :text, ");
        expression_attribute_values.insert(":text".to_string(), AttributeValue::S(text));
        attributes_updated = true;
    }

    if let Some(category) = request.category {
        update_expression.push_str("#cat = :category, ");
        expression_attribute_values.insert(":category".to_string(), AttributeValue::S(category));
        attributes_updated = true;
    }

    if let Some(tags) = request.tags {
        let tag_values: Vec<AttributeValue> = tags.iter()
            .map(|tag| AttributeValue::S(tag.clone()))
            .collect();
        update_expression.push_str("#tgs = :tags, ");
        expression_attribute_values.insert(":tags".to_string(), AttributeValue::L(tag_values));
        attributes_updated = true;
    }

    if !attributes_updated {
        return Ok(error_response(
            StatusCode::BAD_REQUEST,
            "No attributes to update".to_string(),
        ));
    }

    // Remove trailing comma and space
    update_expression = update_expression[0..update_expression.len() - 2].to_string();

    // Build expression attribute names
    let mut expression_attribute_names = HashMap::new();
    if update_expression.contains("#txt") {
        expression_attribute_names.insert("#txt".to_string(), "text".to_string());
    }
    if update_expression.contains("#cat") {
        expression_attribute_names.insert("#cat".to_string(), "category".to_string());
    }
    if update_expression.contains("#tgs") {
        expression_attribute_names.insert("#tgs".to_string(), "tags".to_string());
    }

    // Update item in DynamoDB
    let result = client
        .update_item()
        .table_name(table_name)
        .key("id", AttributeValue::S(id.to_string()))
        .update_expression(update_expression)
        .set_expression_attribute_values(Some(expression_attribute_values))
        .set_expression_attribute_names(Some(expression_attribute_names))
        .send()
        .await;

    match result {
        Ok(_) => {
            // Fetch the updated prompt to return it
            get_prompt_by_id(client, id).await
        }
        Err(e) => {
            error!("Error updating prompt: {:?}", e);
            Ok(error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to update prompt".to_string(),
            ))
        }
    }
}

async fn delete_prompt(
    client: aws_sdk_dynamodb::Client,
    id: &str,
) -> Result<Response, Error> {
    let table_name = std::env::var(PROMPTS_TABLE).expect("PROMPTS_TABLE must be set");

    // Check if prompt exists
    let get_result = client
        .get_item()
        .table_name(&table_name)
        .key("id", AttributeValue::S(id.to_string()))
        .send()
        .await;

    match get_result {
        Ok(response) => {
            if response.item.is_none() {
                return Ok(error_response(
                    StatusCode::NOT_FOUND,
                    format!("Prompt with id {} not found", id),
                ));
            }
        }
        Err(e) => {
            error!("Error checking prompt existence: {:?}", e);
            return Ok(error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to check prompt existence".to_string(),
            ));
        }
    }

    // Delete item from DynamoDB
    let result = client
        .delete_item()
        .table_name(table_name)
        .key("id", AttributeValue::S(id.to_string()))
        .send()
        .await;

    match result {
        Ok(_) => Ok(create_response(
            StatusCode::NO_CONTENT,
            "".to_string(),
        )),
        Err(e) => {
            error!("Error deleting prompt: {:?}", e);
            Ok(error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to delete prompt".to_string(),
            ))
        }
    }
}

fn item_to_prompt(item: HashMap<String, AttributeValue>) -> Result<Prompt, Error> {
    // Extract values from DynamoDB item
    let id = match item.get("id") {
        Some(AttributeValue::S(s)) => s.clone(),
        _ => return Err(Box::new(DbError::InvalidData("Missing id".into()))),
    };

    let text = match item.get("text") {
        Some(AttributeValue::S(s)) => s.clone(),
        _ => return Err(Box::new(DbError::InvalidData("Missing text".into()))),
    };

    let category = match item.get("category") {
        Some(AttributeValue::S(s)) => s.clone(),
        _ => return Err(Box::new(DbError::InvalidData("Missing category".into()))),
    };

    let created_at = match item.get("created_at") {
        Some(AttributeValue::S(s)) => s.clone(),
        _ => return Err(Box::new(DbError::InvalidData("Missing created_at".into()))),
    };

    let tags = if let Some(AttributeValue::L(tag_list)) = item.get("tags") {
        let mut tags = Vec::new();
        for tag_av in tag_list {
            if let AttributeValue::S(tag) = tag_av {
                tags.push(tag.clone());
            }
        }
        Some(tags)
    } else {
        None
    };

    Ok(Prompt {
        id,
        text,
        category,
        created_at,
        tags,
    })
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_ansi(false) // disable ANSI terminal colors for Cloud environments
        .without_time() // AWS already adds time
        .init();

    info!("Prompts Service starting up");

    // Run the Lambda service
    run(service_fn(handle_request)).await
} 