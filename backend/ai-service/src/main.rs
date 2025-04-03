use aws_lambda_events::event::cloudwatch_events::CloudWatchEvent;
use aws_lambda_runtime::{run, service_fn, Error, LambdaEvent};
use aws_sdk_dynamodb::model::AttributeValue;
use journal_common::{
    get_dynamo_client, get_s3_client, publish_event, JournalError,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::env;
use reqwest;
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

// AI Provider enum to represent different LLM providers
enum AiProvider {
    OpenAI,
    Anthropic,
    // Legacy model using rust-bert
    RustBert,
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
    insights: Option<String>,
    reflections: Option<String>,
    provider: String,
}

// OpenAI API structures
#[derive(Serialize)]
struct OpenAIRequest {
    model: String,
    messages: Vec<OpenAIMessage>,
    temperature: f32,
    max_tokens: u32,
}

#[derive(Serialize)]
struct OpenAIMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct OpenAIResponse {
    choices: Vec<OpenAIChoice>,
}

#[derive(Deserialize)]
struct OpenAIChoice {
    message: OpenAIMessage,
}

// Anthropic API structures
#[derive(Serialize)]
struct AnthropicRequest {
    model: String,
    max_tokens: u32,
    temperature: f32,
    system: String,
    messages: Vec<AnthropicMessage>,
}

#[derive(Serialize, Deserialize)]
struct AnthropicMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct AnthropicResponse {
    content: Vec<AnthropicContent>,
}

#[derive(Deserialize)]
struct AnthropicContent {
    text: String,
}

// Get AI provider based on configuration
fn get_ai_provider() -> AiProvider {
    let provider = env::var("AI_PROVIDER").unwrap_or_else(|_| "openai".to_string());
    
    match provider.to_lowercase().as_str() {
        "openai" => AiProvider::OpenAI,
        "anthropic" => AiProvider::Anthropic,
        "rustbert" => AiProvider::RustBert,
        _ => AiProvider::OpenAI, // Default to OpenAI
    }
}

// API key getters
fn get_openai_api_key() -> Result<String, JournalError> {
    env::var("OPENAI_API_KEY").map_err(|_| {
        JournalError::ConfigurationError("OPENAI_API_KEY environment variable is not set".into())
    })
}

fn get_anthropic_api_key() -> Result<String, JournalError> {
    env::var("ANTHROPIC_API_KEY").map_err(|_| {
        JournalError::ConfigurationError("ANTHROPIC_API_KEY environment variable is not set".into())
    })
}

// Process entry with OpenAI
async fn analyze_with_openai(entry: &EntryEvent) -> Result<EntryAnalysis, JournalError> {
    let api_key = get_openai_api_key()?;
    let client = reqwest::Client::new();
    
    // Prepare prompt for analysis
    let system_prompt = "You are an AI journal assistant that analyzes journal entries. \
                         Analyze the entry and provide: \
                         1. The sentiment (positive, negative, or neutral) \
                         2. A sentiment score between -1.0 (very negative) and 1.0 (very positive) \
                         3. 5 keywords from the entry \
                         4. 3 suggested categories for the entry \
                         5. A brief insight about the entry \
                         6. A reflective question to help the writer think deeper \
                         Format your response as JSON with fields: sentiment, sentiment_score, keywords, suggested_categories, insights, reflections";
    
    let entry_text = format!("Title: {}\n\nContent: {}", entry.title, entry.content);
    
    let request = OpenAIRequest {
        model: env::var("OPENAI_MODEL").unwrap_or_else(|_| "gpt-4o".to_string()),
        messages: vec![
            OpenAIMessage {
                role: "system".to_string(),
                content: system_prompt.to_string(),
            },
            OpenAIMessage {
                role: "user".to_string(),
                content: entry_text,
            },
        ],
        temperature: 0.3,
        max_tokens: 1000,
    };
    
    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| JournalError::ExternalApiError(format!("OpenAI API request failed: {}", e)))?;
        
    let response_body: OpenAIResponse = response
        .json()
        .await
        .map_err(|e| JournalError::ExternalApiError(format!("Failed to parse OpenAI response: {}", e)))?;
        
    if response_body.choices.is_empty() {
        return Err(JournalError::ExternalApiError("Empty response from OpenAI".into()));
    }
    
    let analysis_json = response_body.choices[0].message.content.clone();
    
    // Parse JSON response from LLM
    let analysis_value: Value = serde_json::from_str(&analysis_json)
        .map_err(|e| JournalError::ExternalApiError(format!("Failed to parse analysis JSON: {}", e)))?;
    
    let sentiment = analysis_value["sentiment"].as_str()
        .unwrap_or("neutral")
        .to_string();
    
    let sentiment_score = analysis_value["sentiment_score"].as_f64()
        .unwrap_or(0.0) as f32;
    
    let keywords = analysis_value["keywords"].as_array()
        .map(|arr| arr.iter().filter_map(|k| k.as_str().map(String::from)).collect())
        .unwrap_or_else(Vec::new);
    
    let suggested_categories = analysis_value["suggested_categories"].as_array()
        .map(|arr| arr.iter().filter_map(|c| c.as_str().map(String::from)).collect())
        .unwrap_or_else(Vec::new);
    
    let insights = analysis_value["insights"].as_str()
        .map(String::from);
    
    let reflections = analysis_value["reflections"].as_str()
        .map(String::from);
    
    Ok(EntryAnalysis {
        entry_id: entry.entry_id.clone(),
        tenant_id: entry.tenant_id.clone(),
        user_id: entry.user_id.clone(),
        sentiment,
        sentiment_score,
        keywords,
        suggested_categories,
        insights,
        reflections,
        provider: "openai".to_string(),
    })
}

// Process entry with Anthropic
async fn analyze_with_anthropic(entry: &EntryEvent) -> Result<EntryAnalysis, JournalError> {
    let api_key = get_anthropic_api_key()?;
    let client = reqwest::Client::new();
    
    // Prepare prompt for analysis
    let system_prompt = "You are an AI journal assistant that analyzes journal entries. \
                         Analyze the entry and provide: \
                         1. The sentiment (positive, negative, or neutral) \
                         2. A sentiment score between -1.0 (very negative) and 1.0 (very positive) \
                         3. 5 keywords from the entry \
                         4. 3 suggested categories for the entry \
                         5. A brief insight about the entry \
                         6. A reflective question to help the writer think deeper \
                         Format your response as JSON with fields: sentiment, sentiment_score, keywords, suggested_categories, insights, reflections";
    
    let entry_text = format!("Title: {}\n\nContent: {}", entry.title, entry.content);
    
    let request = AnthropicRequest {
        model: env::var("ANTHROPIC_MODEL").unwrap_or_else(|_| "claude-3-haiku-20240307".to_string()),
        max_tokens: 1000,
        temperature: 0.3,
        system: system_prompt.to_string(),
        messages: vec![
            AnthropicMessage {
                role: "user".to_string(),
                content: entry_text,
            },
        ],
    };
    
    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| JournalError::ExternalApiError(format!("Anthropic API request failed: {}", e)))?;
        
    let response_body: AnthropicResponse = response
        .json()
        .await
        .map_err(|e| JournalError::ExternalApiError(format!("Failed to parse Anthropic response: {}", e)))?;
        
    if response_body.content.is_empty() {
        return Err(JournalError::ExternalApiError("Empty response from Anthropic".into()));
    }
    
    let analysis_json = response_body.content[0].text.clone();
    
    // Parse JSON response from LLM
    let analysis_value: Value = serde_json::from_str(&analysis_json)
        .map_err(|e| JournalError::ExternalApiError(format!("Failed to parse analysis JSON: {}", e)))?;
    
    let sentiment = analysis_value["sentiment"].as_str()
        .unwrap_or("neutral")
        .to_string();
    
    let sentiment_score = analysis_value["sentiment_score"].as_f64()
        .unwrap_or(0.0) as f32;
    
    let keywords = analysis_value["keywords"].as_array()
        .map(|arr| arr.iter().filter_map(|k| k.as_str().map(String::from)).collect())
        .unwrap_or_else(Vec::new);
    
    let suggested_categories = analysis_value["suggested_categories"].as_array()
        .map(|arr| arr.iter().filter_map(|c| c.as_str().map(String::from)).collect())
        .unwrap_or_else(Vec::new);
    
    let insights = analysis_value["insights"].as_str()
        .map(String::from);
    
    let reflections = analysis_value["reflections"].as_str()
        .map(String::from);
    
    Ok(EntryAnalysis {
        entry_id: entry.entry_id.clone(),
        tenant_id: entry.tenant_id.clone(),
        user_id: entry.user_id.clone(),
        sentiment,
        sentiment_score,
        keywords,
        suggested_categories,
        insights,
        reflections,
        provider: "anthropic".to_string(),
    })
}

async fn analyze_entry(
    event: &EntryEvent,
) -> Result<EntryAnalysis, JournalError> {
    // Select provider based on configuration
    match get_ai_provider() {
        AiProvider::OpenAI => analyze_with_openai(event).await,
        AiProvider::Anthropic => analyze_with_anthropic(event).await,
        AiProvider::RustBert => {
            // Fallback to simplified analysis for testing/development environments
            let sentiment = "neutral".to_string();
            let sentiment_score = 0.0;
            
            // Simple keyword extraction
            let words: Vec<String> = event.content
                .split_whitespace()
                .map(|w| w.to_lowercase())
                .filter(|w| w.len() > 4)  // Only consider longer words
                .collect();
                
            let keywords: Vec<String> = words
                .iter()
                .take(5)
                .cloned()
                .collect();
                
            let suggested_categories = vec![
                "general".to_string(),
                "journal".to_string(),
            ];
            
            Ok(EntryAnalysis {
                entry_id: event.entry_id.clone(),
                tenant_id: event.tenant_id.clone(),
                user_id: event.user_id.clone(),
                sentiment,
                sentiment_score,
                keywords,
                suggested_categories,
                insights: Some("This is a journal entry about various thoughts and experiences.".to_string()),
                reflections: Some("What more would you like to explore about this topic?".to_string()),
                provider: "rustbert".to_string(),
            })
        }
    }
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
    item.insert("provider".to_string(), AttributeValue::S(analysis.provider.clone()));
    
    if !analysis.keywords.is_empty() {
        item.insert("keywords".to_string(), AttributeValue::Ss(analysis.keywords.clone()));
    }
    
    if !analysis.suggested_categories.is_empty() {
        item.insert(
            "suggested_categories".to_string(),
            AttributeValue::Ss(analysis.suggested_categories.clone()),
        );
    }
    
    // Add insights and reflections if present
    if let Some(insights) = &analysis.insights {
        item.insert("insights".to_string(), AttributeValue::S(insights.clone()));
    }
    
    if let Some(reflections) = &analysis.reflections {
        item.insert("reflections".to_string(), AttributeValue::S(reflections.clone()));
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
    
    // Analyze entry using configured provider
    let analysis = match analyze_entry(&entry_event).await {
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
    let mut event_detail = serde_json::json!({
        "entry_id": analysis.entry_id,
        "tenant_id": analysis.tenant_id,
        "user_id": analysis.user_id,
        "sentiment": analysis.sentiment,
        "sentiment_score": analysis.sentiment_score,
        "keywords": analysis.keywords,
        "suggested_categories": analysis.suggested_categories,
        "provider": analysis.provider,
    });
    
    // Add insights and reflections if present
    if let Some(insights) = &analysis.insights {
        event_detail["insights"] = serde_json::Value::String(insights.clone());
    }
    
    if let Some(reflections) = &analysis.reflections {
        event_detail["reflections"] = serde_json::Value::String(reflections.clone());
    }
    
    if let Err(e) = publish_event("AiInsightsReady", event_detail).await {
        tracing::error!("Failed to publish event: {}", e);
        // Continue anyway - this is non-critical
    }
    
    tracing::info!("Analysis completed successfully using provider: {}", analysis.provider);
    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    run(service_fn(handler)).await
}
