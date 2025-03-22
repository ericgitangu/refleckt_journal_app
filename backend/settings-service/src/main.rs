use aws_lambda_events::apigw::{ApiGatewayProxyRequest, ApiGatewayProxyResponse};
use aws_lambda_runtime::{run, service_fn, Error, LambdaEvent};
use aws_sdk_dynamodb::model::AttributeValue;
use journal_common::{
    error_response, extract_tenant_context, get_dynamo_client, json_response, publish_event, JournalError,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

// Category model
#[derive(Debug, Serialize, Deserialize)]
struct Category {
    id: String,
    name: String,
    color: Option<String>,
    description: Option<String>,
    tenant_id: String,
    user_id: String,
}

// User settings model
#[derive(Debug, Serialize, Deserialize)]
struct UserSettings {
    tenant_id: String,
    user_id: String,
    theme: Option<String>,
    date_format: Option<String>,
    notification_preferences: Option<NotificationPreferences>,
    display_preferences: Option<DisplayPreferences>,
}

#[derive(Debug, Serialize, Deserialize)]
struct NotificationPreferences {
    email_notifications: bool,
    reminders_enabled: bool,
    reminder_time: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct DisplayPreferences {
    default_view: Option<String>,
    entries_per_page: Option<i32>,
    show_word_count: Option<bool>,
    show_insights: Option<bool>,
}

// Input models
#[derive(Debug, Deserialize)]
struct CreateCategoryInput {
    name: String,
    color: Option<String>,
    description: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UpdateCategoryInput {
    name: Option<String>,
    color: Option<String>,
    description: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UpdateSettingsInput {
    theme: Option<String>,
    date_format: Option<String>,
    notification_preferences: Option<NotificationPreferences>,
    display_preferences: Option<DisplayPreferences>,
}

async fn create_category(
    event: ApiGatewayProxyRequest,
) -> Result<ApiGatewayProxyResponse, Error> {
    // Extract tenant context
    let claims = match extract_tenant_context(&event.headers).await {
        Ok(claims) => claims,
        Err(e) => return Ok(error_response(401, &e)),
    };
    
    // Parse request body
    let body = event.body.ok_or_else(|| JournalError::ValidationError("Missing request body".into()))?;
    let input: CreateCategoryInput = match serde_json::from_str(&body) {
        Ok(input) => input,
        Err(e) => return Ok(error_response(400, &JournalError::ValidationError(e.to_string()))),
    };
    
    // Validate input
    if input.name.is_empty() {
        return Ok(error_response(400, &JournalError::ValidationError("Name is required".into())));
    }
    
    // Generate category ID
    let category_id = Uuid::new_v4().to_string();
    
    // Prepare DynamoDB item
    let dynamo_client = get_dynamo_client().await;
    let mut item = HashMap::new();
    
    item.insert("id".to_string(), AttributeValue::S(category_id.clone()));
    item.insert("tenant_id".to_string(), AttributeValue::S(claims.tenant_id.clone()));
    item.insert("user_id".to_string(), AttributeValue::S(claims.sub.clone()));
    item.insert("name".to_string(), AttributeValue::S(input.name));
    
    // Add optional fields
    if let Some(color) = input.color {
        item.insert("color".to_string(), AttributeValue::S(color));
    }
    
    if let Some(description) = input.description {
        item.insert("description".to_string(), AttributeValue::S(description));
    }
    
    // Save to DynamoDB
    let table_name = std::env::var("CATEGORIES_TABLE").unwrap_or_else(|_| "reflekt-categories".to_string());
    
    match dynamo_client
        .put_item()
        .table_name(table_name)
        .set_item(Some(item))
        .send()
        .await
    {
        Ok(_) => {
            // Create the category response
            let category = Category {
                id: category_id,
                name: input.name,
                color: input.color,
                description: input.description,
                tenant_id: claims.tenant_id,
                user_id: claims.sub,
            };
            
            Ok(json_response(201, &category))
        }
        Err(e) => Ok(error_response(
            500,
            &JournalError::DatabaseError(format!("Failed to save category: {}", e)),
        )),
    }
}

async fn get_categories(
    event: ApiGatewayProxyRequest,
) -> Result<ApiGatewayProxyResponse, Error> {
    // Extract tenant context
    let claims = match extract_tenant_context(&event.headers).await {
        Ok(claims) => claims,
        Err(e) => return Ok(error_response(401, &e)),
    };
    
    // Query DynamoDB for categories
    let dynamo_client = get_dynamo_client().await;
    let table_name = std::env::var("CATEGORIES_TABLE").unwrap_or_else(|_| "reflekt-categories".to_string());
    
    let result = dynamo_client
        .query()
        .table_name(table_name)
        .key_condition_expression("tenant_id = :tenant_id AND user_id = :user_id")
        .expression_attribute_values(":tenant_id", AttributeValue::S(claims.tenant_id.clone()))
        .expression_attribute_values(":user_id", AttributeValue::S(claims.sub.clone()))
        .send()
        .await;
    
    match result {
        Ok(response) => {
            // Convert items to categories
            let categories: Vec<Category> = response
                .items()
                .unwrap_or_default()
                .iter()
                .map(|item| {
                    Category {
                        id: item.get("id").unwrap().as_s().unwrap().clone(),
                        name: item.get("name").unwrap().as_s().unwrap().clone(),
                        color: item.get("color").map(|v| v.as_s().unwrap().clone()),
                        description: item.get("description").map(|v| v.as_s().unwrap().clone()),
                        tenant_id: item.get("tenant_id").unwrap().as_s().unwrap().clone(),
                        user_id: item.get("user_id").unwrap().as_s().unwrap().clone(),
                    }
                })
                .collect();
            
            Ok(json_response(200, &categories))
        }
        Err(e) => Ok(error_response(
            500,
            &JournalError::DatabaseError(format!("Failed to get categories: {}", e)),
        )),
    }
}

async fn update_category(
    event: ApiGatewayProxyRequest,
) -> Result<ApiGatewayProxyResponse, Error> {
    // Extract tenant context
    let claims = match extract_tenant_context(&event.headers).await {
        Ok(claims) => claims,
        Err(e) => return Ok(error_response(401, &e)),
    };
    
    // Get category ID from path
    let category_id = match event.path_parameters.get("id") {
        Some(id) => id,
        None => return Ok(error_response(400, &JournalError::ValidationError("Missing category ID".into()))),
    };
    
    // Parse request body
    let body = event.body.ok_or_else(|| JournalError::ValidationError("Missing request body".into()))?;
    let input: UpdateCategoryInput = match serde_json::from_str(&body) {
        Ok(input) => input,
        Err(e) => return Ok(error_response(400, &JournalError::ValidationError(e.to_string()))),
    };
    
    // Check if category exists and user owns it
    let dynamo_client = get_dynamo_client().await;
    let table_name = std::env::var("CATEGORIES_TABLE").unwrap_or_else(|_| "reflekt-categories".to_string());
    
    let result = dynamo_client
        .get_item()
        .table_name(&table_name)
        .key("id", AttributeValue::S(category_id.to_string()))
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
                        _ => return Ok(error_response(403, &JournalError::AuthError("Not authorized to update this category".into()))),
                    };
                    
                    if user_id != &claims.sub {
                        return Ok(error_response(403, &JournalError::AuthError("Not authorized to update this category".into())));
                    }
                    
                    // Build update expression
                    let mut update_expression = "SET ".to_string();
                    let mut expression_values = HashMap::new();
                    let mut expression_names = HashMap::new();
                    let mut is_first = true;
                    
                    // Add name if present
                    if let Some(name) = &input.name {
                        update_expression.push_str("#name = :name");
                        expression_values.insert(":name".to_string(), AttributeValue::S(name.clone()));
                        expression_names.insert("#name".to_string(), "name".to_string());
                        is_first = false;
                    }
                    
                    // Add color if present
                    if let Some(color) = &input.color {
                        if !is_first {
                            update_expression.push_str(", ");
                        }
                        update_expression.push_str("color = :color");
                        expression_values.insert(":color".to_string(), AttributeValue::S(color.clone()));
                        is_first = false;
                    }
                    
                    // Add description if present
                    if let Some(description) = &input.description {
                        if !is_first {
                            update_expression.push_str(", ");
                        }
                        update_expression.push_str("description = :description");
                        expression_values.insert(":description".to_string(), AttributeValue::S(description.clone()));
                    }
                    
                    // Update category
                    match dynamo_client
                        .update_item()
                        .table_name(table_name)
                        .key("id", AttributeValue::S(category_id.to_string()))
                        .key("tenant_id", AttributeValue::S(claims.tenant_id.clone()))
                        .update_expression(update_expression)
                        .set_expression_attribute_values(Some(expression_values))
                        .set_expression_attribute_names(Some(expression_names))
                        .return_values("ALL_NEW")
                        .send()
                        .await
                    {
                        Ok(response) => {
                            // Build updated category
                            let updated_item = response.attributes().unwrap();
                            
                            let category = Category {
                                id: updated_item.get("id").unwrap().as_s().unwrap().clone(),
                                name: updated_item.get("name").unwrap().as_s().unwrap().clone(),
                                color: updated_item.get("color").map(|v| v.as_s().unwrap().clone()),
                                description: updated_item.get("description").map(|v| v.as_s().unwrap().clone()),
                                tenant_id: updated_item.get("tenant_id").unwrap().as_s().unwrap().clone(),
                                user_id: updated_item.get("user_id").unwrap().as_s().unwrap().clone(),
                            };
                            
                            Ok(json_response(200, &category))
                        }
                        Err(e) => Ok(error_response(
                            500,
                            &JournalError::DatabaseError(format!("Failed to update category: {}", e)),
                        )),
                    }
                }
                None => Ok(error_response(404, &JournalError::NotFoundError("Category not found".into()))),
            }
        }
        Err(e) => Ok(error_response(
            500,
            &JournalError::DatabaseError(format!("Failed to fetch category: {}", e)),
        )),
    }
}

async fn delete_category(
    event: ApiGatewayProxyRequest,
) -> Result<ApiGatewayProxyResponse, Error> {
    // Extract tenant context
    let claims = match extract_tenant_context(&event.headers).await {
        Ok(claims) => claims,
        Err(e) => return Ok(error_response(401, &e)),
    };
    
    // Get category ID from path
    let category_id = match event.path_parameters.get("id") {
        Some(id) => id,
        None => return Ok(error_response(400, &JournalError::ValidationError("Missing category ID".into()))),
    };
    
    // Check if category exists and user owns it
    let dynamo_client = get_dynamo_client().await;
    let table_name = std::env::var("CATEGORIES_TABLE").unwrap_or_else(|_| "reflekt-categories".to_string());
    
    let result = dynamo_client
        .get_item()
        .table_name(&table_name)
        .key("id", AttributeValue::S(category_id.to_string()))
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
                        _ => return Ok(error_response(403, &JournalError::AuthError("Not authorized to delete this category".into()))),
                    };
                    
                    if user_id != &claims.sub {
                        return Ok(error_response(403, &JournalError::AuthError("Not authorized to delete this category".into())));
                    }
                    
                    // Delete category
                    match dynamo_client
                        .delete_item()
                        .table_name(table_name)
                        .key("id", AttributeValue::S(category_id.to_string()))
                        .key("tenant_id", AttributeValue::S(claims.tenant_id.clone()))
                        .send()
                        .await
                    {
                        Ok(_) => {
                            Ok(json_response(200, &serde_json::json!({ "success": true })))
                        }
                        Err(e) => Ok(error_response(
                            500,
                            &JournalError::DatabaseError(format!("Failed to delete category: {}", e)),
                        )),
                    }
                }
                None => Ok(error_response(404, &JournalError::NotFoundError("Category not found".into()))),
            }
        }
        Err(e) => Ok(error_response(
            500,
            &JournalError::DatabaseError(format!("Failed to fetch category: {}", e)),
        )),
    }
}

async fn get_settings(
    event: ApiGatewayProxyRequest,
) -> Result<ApiGatewayProxyResponse, Error> {
    // Extract tenant context
    let claims = match extract_tenant_context(&event.headers).await {
        Ok(claims) => claims,
        Err(e) => return Ok(error_response(401, &e)),
    };
    
    // Get settings from DynamoDB
    let dynamo_client = get_dynamo_client().await;
    let table_name = std::env::var("SETTINGS_TABLE").unwrap_or_else(|_| "reflekt-settings".to_string());
    
    let result = dynamo_client
        .get_item()
        .table_name(table_name)
        .key("tenant_id", AttributeValue::S(claims.tenant_id.clone()))
        .key("user_id", AttributeValue::S(claims.sub.clone()))
        .send()
        .await;
    
    match result {
        Ok(response) => {
            if let Some(item) = response.item {
                // Convert DynamoDB item to UserSettings
                let settings = UserSettings {
                    tenant_id: claims.tenant_id.clone(),
                    user_id: claims.sub.clone(),
                    theme: item.get("theme").map(|v| v.as_s().unwrap().clone()),
                    date_format: item.get("date_format").map(|v| v.as_s().unwrap().clone()),
                    notification_preferences: if let Some(AttributeValue::M(prefs)) = item.get("notification_preferences") {
                        Some(NotificationPreferences {
                            email_notifications: prefs.get("email_notifications")
                                .map(|v| v.as_bool().unwrap_or(false))
                                .unwrap_or(false),
                            reminders_enabled: prefs.get("reminders_enabled")
                                .map(|v| v.as_bool().unwrap_or(false))
                                .unwrap_or(false),
                            reminder_time: prefs.get("reminder_time")
                                .map(|v| v.as_s().unwrap().clone()),
                        })
                    } else {
                        None
                    },
                    display_preferences: if let Some(AttributeValue::M(prefs)) = item.get("display_preferences") {
                        Some(DisplayPreferences {
                            default_view: prefs.get("default_view")
                                .map(|v| v.as_s().unwrap().clone()),
                            entries_per_page: prefs.get("entries_per_page")
                                .and_then(|v| v.as_n().ok())
                                .and_then(|n| n.parse::<i32>().ok()),
                            show_word_count: prefs.get("show_word_count")
                                .map(|v| v.as_bool().unwrap_or(false)),
                            show_insights: prefs.get("show_insights")
                                .map(|v| v.as_bool().unwrap_or(true)),
                        })
                    } else {
                        None
                    },
                };
                
                Ok(json_response(200, &settings))
            } else {
                // Return default settings if none found
                let default_settings = UserSettings {
                    tenant_id: claims.tenant_id,
                    user_id: claims.sub,
                    theme: Some("system".to_string()),
                    date_format: Some("YYYY-MM-DD".to_string()),
                    notification_preferences: Some(NotificationPreferences {
                        email_notifications: false,
                        reminders_enabled: false,
                        reminder_time: None,
                    }),
                    display_preferences: Some(DisplayPreferences {
                        default_view: Some("entries".to_string()),
                        entries_per_page: Some(10),
                        show_word_count: Some(true),
                        show_insights: Some(true),
                    }),
                };
                
                Ok(json_response(200, &default_settings))
            }
        }
        Err(e) => Ok(error_response(
            500,
            &JournalError::DatabaseError(format!("Failed to get settings: {}", e)),
        )),
    }
}

async fn update_settings(
    event: ApiGatewayProxyRequest,
) -> Result<ApiGatewayProxyResponse, Error> {
    // Extract tenant context
    let claims = match extract_tenant_context(&event.headers).await {
        Ok(claims) => claims,
        Err(e) => return Ok(error_response(401, &e)),
    };
    
    // Parse request body
    let body = event.body.ok_or_else(|| JournalError::ValidationError("Missing request body".into()))?;
    let input: UpdateSettingsInput = match serde_json::from_str(&body) {
        Ok(input) => input,
        Err(e) => return Ok(error_response(400, &JournalError::ValidationError(e.to_string()))),
    };
    
    // Build update expression
    let mut update_expression = "SET ".to_string();
    let mut expression_values = HashMap::new();
    let mut is_first = true;
    
    // Add theme if present
    if let Some(theme) = &input.theme {
        update_expression.push_str("theme = :theme");
        expression_values.insert(":theme".to_string(), AttributeValue::S(theme.clone()));
        is_first = false;
    }
    
    // Add date_format if present
    if let Some(date_format) = &input.date_format {
        if !is_first {
            update_expression.push_str(", ");
        }
        update_expression.push_str("date_format = :date_format");
        expression_values.insert(":date_format".to_string(), AttributeValue::S(date_format.clone()));
        is_first = false;
    }
    
    // Add notification_preferences if present
    if let Some(notification_prefs) = &input.notification_preferences {
        if !is_first {
            update_expression.push_str(", ");
        }
        
        let mut prefs_map = HashMap::new();
        
        prefs_map.insert(
            "email_notifications".to_string(),
            AttributeValue::Bool(notification_prefs.email_notifications),
        );
        
        prefs_map.insert(
            "reminders_enabled".to_string(),
            AttributeValue::Bool(notification_prefs.reminders_enabled),
        );
        
        if let Some(reminder_time) = &notification_prefs.reminder_time {
            prefs_map.insert(
                "reminder_time".to_string(),
                AttributeValue::S(reminder_time.clone()),
            );
        }
        
        update_expression.push_str("notification_preferences = :notification_prefs");
        expression_values.insert(":notification_prefs".to_string(), AttributeValue::M(prefs_map));
        is_first = false;
    }
    
    // Add display_preferences if present
    if let Some(display_prefs) = &input.display_preferences {
        if !is_first {
            update_expression.push_str(", ");
        }
        
        let mut prefs_map = HashMap::new();
        
        if let Some(default_view) = &display_prefs.default_view {
            prefs_map.insert(
                "default_view".to_string(),
                AttributeValue::S(default_view.clone()),
            );
        }
        
        if let Some(entries_per_page) = display_prefs.entries_per_page {
            prefs_map.insert(
                "entries_per_page".to_string(),
                AttributeValue::N(entries_per_page.to_string()),
            );
        }
        
        if let Some(show_word_count) = display_prefs.show_word_count {
            prefs_map.insert(
                "show_word_count".to_string(),
                AttributeValue::Bool(show_word_count),
            );
        }
        
        if let Some(show_insights) = display_prefs.show_insights {
            prefs_map.insert(
                "show_insights".to_string(),
                AttributeValue::Bool(show_insights),
            );
        }
        
        update_expression.push_str("display_preferences = :display_prefs");
        expression_values.insert(":display_prefs".to_string(), AttributeValue::M(prefs_map));
    }
    
    // Update settings in DynamoDB
    let dynamo_client = get_dynamo_client().await;
    let table_name = std::env::var("SETTINGS_TABLE").unwrap_or_else(|_| "reflekt-settings".to_string());
    
    match dynamo_client
        .update_item()
        .table_name(table_name)
        .key("tenant_id", AttributeValue::S(claims.tenant_id.clone()))
        .key("user_id", AttributeValue::S(claims.sub.clone()))
        .update_expression(update_expression)
        .set_expression_attribute_values(Some(expression_values))
        .return_values("ALL_NEW")
        .send()
        .await
    {
        Ok(response) => {
            // Build updated settings
            let updated_item = response.attributes().unwrap();
            
            let settings = UserSettings {
                tenant_id: claims.tenant_id,
                user_id: claims.sub,
                theme: updated_item.get("theme").map(|v| v.as_s().unwrap().clone()),
                date_format: updated_item.get("date_format").map(|v| v.as_s().unwrap().clone()),
                notification_preferences: if let Some(AttributeValue::M(prefs)) = updated_item.get("notification_preferences") {
                    Some(NotificationPreferences {
                        email_notifications: prefs.get("email_notifications")
                            .map(|v| v.as_bool().unwrap_or(false))
                            .unwrap_or(false),
                        reminders_enabled: prefs.get("reminders_enabled")
                            .map(|v| v.as_bool().unwrap_or(false))
                            .unwrap_or(false),
                        reminder_time: prefs.get("reminder_time")
                            .map(|v| v.as_s().unwrap().clone()),
                    })
                } else {
                    None
                },
                display_preferences: if let Some(AttributeValue::M(prefs)) = updated_item.get("display_preferences") {
                    Some(DisplayPreferences {
                        default_view: prefs.get("default_view")
                            .map(|v| v.as_s().unwrap().clone()),
                        entries_per_page: prefs.get("entries_per_page")
                            .and_then(|v| v.as_n().ok())
                            .and_then(|n| n.parse::<i32>().ok()),
                        show_word_count: prefs.get("show_word_count")
                            .map(|v| v.as_bool().unwrap_or(false)),
                        show_insights: prefs.get("show_insights")
                            .map(|v| v.as_bool().unwrap_or(true)),
                    })
                } else {
                    None
                },
            };
            
            Ok(json_response(200, &settings))
        }
        Err(e) => Ok(error_response(
            500,
            &JournalError::DatabaseError(format!("Failed to update settings: {}", e)),
        )),
    }
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
        ("GET", "/settings/categories") => get_categories(event.payload).await,
        ("POST", "/settings/categories") => create_category(event.payload).await,
        ("PUT", p) if p.starts_with("/settings/categories/") => update_category(event.payload).await,
        ("DELETE", p) if p.starts_with("/settings/categories/") => delete_category(event.payload).await,
        ("GET", "/settings") => get_settings(event.payload).await,
        ("PUT", "/settings") => update_settings(event.payload).await,
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
