use aws_config::meta::region::RegionProviderChain;
use aws_sdk_dynamodb::Client as DynamoDbClient;
use aws_sdk_s3::Client as S3Client;
use aws_sdk_secretsmanager::Client as SecretsClient;
use aws_sdk_eventbridge::Client as EventBridgeClient;
use aws_lambda_events::encodings::Body;
use aws_lambda_events::http::{HeaderMap, HeaderValue, Response};
use jsonwebtoken::{decode, DecodingKey, TokenData, Validation};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::OnceCell;
use std::error::Error;
use std::fmt;

// Singleton clients for AWS services
static DYNAMO_CLIENT: OnceCell<DynamoDbClient> = OnceCell::const_new();
static S3_CLIENT: OnceCell<S3Client> = OnceCell::const_new();
static SECRETS_CLIENT: OnceCell<SecretsClient> = OnceCell::const_new();
static EVENTS_CLIENT: OnceCell<EventBridgeClient> = OnceCell::const_new();

// Error type for library
#[derive(Debug)]
pub enum JournalError {
    AuthError(String),
    DatabaseError(String),
    ValidationError(String),
    NotFoundError(String),
    EventError(String),
    InternalError(String),
}

impl fmt::Display for JournalError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            JournalError::AuthError(msg) => write!(f, "Auth error: {}", msg),
            JournalError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            JournalError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            JournalError::NotFoundError(msg) => write!(f, "Not found: {}", msg),
            JournalError::EventError(msg) => write!(f, "Event error: {}", msg),
            JournalError::InternalError(msg) => write!(f, "Internal error: {}", msg),
        }
    }
}

impl Error for JournalError {}

// JWT Claims structure matching NextAuth tokens
#[derive(Debug, Deserialize, Serialize)]
pub struct JwtClaims {
    pub sub: String,
    pub email: String,
    pub tenant_id: String,
    pub iat: i64,
    pub exp: i64,
    pub role: Option<String>,
}

// API Response helper
pub fn json_response<T: Serialize>(status_code: i32, body: &T) -> Response<Body> {
    let mut headers = HeaderMap::new();
    headers.insert("content-type", HeaderValue::from_static("application/json"));
    
    let body_str = serde_json::to_string(body).unwrap_or_else(|_| "{}".to_string());
    
    Response {
        status_code,
        headers,
        body: Some(Body::Text(body_str)),
        is_base64_encoded: false,
    }
}

// Error response helper
pub fn error_response(status_code: i32, error: &JournalError) -> Response<Body> {
    let error_body = serde_json::json!({
        "error": error.to_string(),
    });
    
    json_response(status_code, &error_body)
}

// Initialize and get DynamoDB client
pub async fn get_dynamo_client() -> DynamoDbClient {
    DYNAMO_CLIENT.get_or_init(|| async {
        let region_provider = RegionProviderChain::default_provider().or_else("us-east-1");
        let config = aws_config::from_env().region(region_provider).load().await;
        DynamoDbClient::new(&config)
    }).await.clone()
}

// Initialize and get S3 client
pub async fn get_s3_client() -> S3Client {
    S3_CLIENT.get_or_init(|| async {
        let region_provider = RegionProviderChain::default_provider().or_else("us-east-1");
        let config = aws_config::from_env().region(region_provider).load().await;
        S3Client::new(&config)
    }).await.clone()
}

// Initialize and get EventBridge client
pub async fn get_events_client() -> EventBridgeClient {
    EVENTS_CLIENT.get_or_init(|| async {
        let region_provider = RegionProviderChain::default_provider().or_else("us-east-1");
        let config = aws_config::from_env().region(region_provider).load().await;
        EventBridgeClient::new(&config)
    }).await.clone()
}

// Validate JWT token
pub fn validate_token(token: &str, jwt_secret: &str) -> Result<TokenData<JwtClaims>, JournalError> {
    decode::<JwtClaims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|e| JournalError::AuthError(format!("Invalid token: {}", e)))
}

// Extract JWT from Authorization header
pub fn extract_jwt(headers: &HeaderMap) -> Result<String, JournalError> {
    let auth_header = headers
        .get("authorization")
        .or_else(|| headers.get("Authorization"))
        .ok_or_else(|| JournalError::AuthError("Missing Authorization header".into()))?;
    
    let auth_value = auth_header.to_str()
        .map_err(|_| JournalError::AuthError("Invalid Authorization header".into()))?;
    
    if !auth_value.starts_with("Bearer ") {
        return Err(JournalError::AuthError("Invalid Authorization format".into()));
    }
    
    Ok(auth_value[7..].to_string())
}

// Extract tenant context from JWT token
pub async fn extract_tenant_context(
    headers: &HeaderMap,
) -> Result<JwtClaims, JournalError> {
    let token = extract_jwt(headers)?;
    
    // In production, we would get this from Secrets Manager
    let jwt_secret = std::env::var("JWT_SECRET")
        .map_err(|_| JournalError::InternalError("JWT_SECRET not set".into()))?;
    
    let token_data = validate_token(&token, &jwt_secret)?;
    Ok(token_data.claims)
}

// Publish event to EventBridge
pub async fn publish_event(
    event_type: &str,
    detail: serde_json::Value,
) -> Result<(), JournalError> {
    let client = get_events_client().await;
    
    let event_bus = std::env::var("EVENT_BUS_NAME")
        .unwrap_or_else(|_| "reflekt-journal-events".to_string());
    
    let result = client
        .put_events()
        .entries(
            aws_sdk_eventbridge::model::PutEventsRequestEntry::builder()
                .event_bus_name(event_bus)
                .source("reflekt.journal")
                .detail_type(event_type)
                .detail(aws_sdk_eventbridge::types::Blob::new(detail.to_string()))
                .build(),
        )
        .send()
        .await
        .map_err(|e| JournalError::EventError(format!("Failed to publish event: {}", e)))?;
    
    // Check for failed entries
    if let Some(failed) = result.failed_entry_count() {
        if failed > 0 {
            return Err(JournalError::EventError(format!("{} events failed to publish", failed)));
        }
    }
    
    Ok(())
}
