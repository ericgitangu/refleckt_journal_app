use aws_config::meta::region::RegionProviderChain;
use aws_sdk_dynamodb::Client as DynamoDbClient;
use aws_sdk_s3::Client as S3Client;
use aws_sdk_secretsmanager::Client as SecretsClient;
use aws_sdk_eventbridge::Client as EventBridgeClient;
use aws_lambda_events::apigw::ApiGatewayProxyResponse;
use aws_lambda_events::encodings::Body;
use aws_lambda_events::http::HeaderMap;
use jwt::{Header, Token, VerifyWithKey};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use serde::{Deserialize, Serialize};
use std::error::Error;
use std::fmt;
use tokio::sync::OnceCell;

// Re-export commonly used dependencies
pub use jwt;
pub use hmac;
pub use sha2;
pub use chrono;
pub use lambda_runtime;
pub use lambda_http;
pub use base64;
pub use uuid;
pub use serde;
pub use serde_json;
pub use serde_qs;
pub use tokio;
pub use tracing;
pub use tracing_subscriber;
pub use aws_lambda_events;
pub use aws_sdk_dynamodb;

// Singleton clients for AWS services
static DYNAMO_CLIENT: OnceCell<DynamoDbClient> = OnceCell::const_new();
static S3_CLIENT: OnceCell<S3Client> = OnceCell::const_new();
static SECRETS_CLIENT: OnceCell<SecretsClient> = OnceCell::const_new();
static EVENTS_CLIENT: OnceCell<EventBridgeClient> = OnceCell::const_new();

// Error type for library
#[derive(Debug)]
pub enum JournalError {
    AuthError(String),
    AuthorizationError(String),
    ConfigurationError(String),
    DatabaseError(String),
    ExternalApiError(String),
    ValidationError(String),
    NotFoundError(String),
    EventError(String),
    InternalError(String),
}

impl fmt::Display for JournalError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            JournalError::AuthError(msg) => write!(f, "Auth error: {}", msg),
            JournalError::AuthorizationError(msg) => write!(f, "Authorization error: {}", msg),
            JournalError::ConfigurationError(msg) => write!(f, "Configuration error: {}", msg),
            JournalError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            JournalError::ExternalApiError(msg) => write!(f, "External API error: {}", msg),
            JournalError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            JournalError::NotFoundError(msg) => write!(f, "Not found: {}", msg),
            JournalError::EventError(msg) => write!(f, "Event error: {}", msg),
            JournalError::InternalError(msg) => write!(f, "Internal error: {}", msg),
        }
    }
}

impl Error for JournalError {}

// JWT Claims structure matching NextAuth tokens
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct JwtClaims {
    pub sub: String,
    pub email: String,
    pub tenant_id: String,
    pub iat: i64,
    pub exp: i64,
    pub role: Option<String>,
}

// API Response helper
pub fn json_response<T: Serialize>(status_code: i32, body: &T) -> ApiGatewayProxyResponse {
    let body_str = serde_json::to_string(body).unwrap_or_else(|_| "{}".to_string());

    let mut headers = aws_lambda_events::http::HeaderMap::new();
    headers.insert("content-type", "application/json".parse().unwrap());

    ApiGatewayProxyResponse {
        status_code: status_code as i64,
        headers,
        multi_value_headers: Default::default(),
        body: Some(Body::Text(body_str)),
        is_base64_encoded: false,
    }
}

// Error response helper
pub fn error_response(status_code: i32, error: &JournalError) -> ApiGatewayProxyResponse {
    let error_body = serde_json::json!({
        "error": error.to_string(),
    });

    json_response(status_code, &error_body)
}

// Initialize and get DynamoDB client
pub async fn get_dynamo_client() -> DynamoDbClient {
    DYNAMO_CLIENT.get_or_init(|| async {
        let region_provider = RegionProviderChain::default_provider().or_else("us-east-1");
        let config = aws_config::defaults(aws_config::BehaviorVersion::latest())
            .region(region_provider)
            .load()
            .await;
        DynamoDbClient::new(&config)
    }).await.clone()
}

// Initialize and get S3 client
pub async fn get_s3_client() -> S3Client {
    S3_CLIENT.get_or_init(|| async {
        let region_provider = RegionProviderChain::default_provider().or_else("us-east-1");
        let config = aws_config::defaults(aws_config::BehaviorVersion::latest())
            .region(region_provider)
            .load()
            .await;
        S3Client::new(&config)
    }).await.clone()
}

// Initialize and get Secrets Manager client
pub async fn get_secrets_client() -> SecretsClient {
    SECRETS_CLIENT.get_or_init(|| async {
        let region_provider = RegionProviderChain::default_provider().or_else("us-east-1");
        let config = aws_config::defaults(aws_config::BehaviorVersion::latest())
            .region(region_provider)
            .load()
            .await;
        SecretsClient::new(&config)
    }).await.clone()
}

// Initialize and get EventBridge client
pub async fn get_events_client() -> EventBridgeClient {
    EVENTS_CLIENT.get_or_init(|| async {
        let region_provider = RegionProviderChain::default_provider().or_else("us-east-1");
        let config = aws_config::defaults(aws_config::BehaviorVersion::latest())
            .region(region_provider)
            .load()
            .await;
        EventBridgeClient::new(&config)
    }).await.clone()
}

// Validate JWT token with new JWT library
pub fn validate_token(token: &str, jwt_secret: &str) -> Result<JwtClaims, JournalError> {
    // Create a HMAC-SHA256 key
    type HmacSha256 = Hmac<Sha256>;
    let key = HmacSha256::new_from_slice(jwt_secret.as_bytes())
        .map_err(|e| JournalError::AuthError(format!("Invalid key: {}", e)))?;
    
    // Parse and verify the token
    let verified_token = Token::<Header, JwtClaims, _>::parse_unverified(token)
        .map_err(|e| JournalError::AuthError(format!("Invalid token format: {}", e)))?
        .verify_with_key(&key)
        .map_err(|e| JournalError::AuthError(format!("Invalid token signature: {}", e)))?;
    
    // Get claims from the token
    let claims = verified_token.claims().clone();
    
    // Check expiration
    let now = chrono::Utc::now().timestamp();
    if claims.exp < now {
        return Err(JournalError::AuthError("Token expired".into()));
    }
    
    Ok(claims)
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
    
    // Try to get JWT secret from Secrets Manager first, fall back to environment variable
    let jwt_secret = match std::env::var("USE_SECRETS_MANAGER").ok() {
        Some(val) if val == "true" => {
            let client = get_secrets_client().await;
            let secret_name = std::env::var("JWT_SECRET_NAME")
                .unwrap_or_else(|_| "reflekt/jwt-secret".to_string());
            
            match client.get_secret_value().secret_id(secret_name).send().await {
                Ok(response) => {
                    response.secret_string()
                        .ok_or_else(|| JournalError::InternalError("JWT secret not found in Secrets Manager".into()))?
                        .to_string()
                },
                Err(_) => {
                    // Fall back to environment variable
                    std::env::var("JWT_SECRET")
                        .map_err(|_| JournalError::InternalError("JWT_SECRET not set".into()))?
                }
            }
        },
        _ => {
            // Use environment variable directly
            std::env::var("JWT_SECRET")
                .map_err(|_| JournalError::InternalError("JWT_SECRET not set".into()))?
        }
    };
    
    let claims = validate_token(&token, &jwt_secret)?;
    Ok(claims)
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
            aws_sdk_eventbridge::types::PutEventsRequestEntry::builder()
                .event_bus_name(event_bus)
                .source("reflekt.journal")
                .detail_type(event_type)
                .detail(serde_json::to_string(&detail).unwrap_or_default())
                .build(),
        )
        .send()
        .await
        .map_err(|e| JournalError::EventError(format!("Failed to publish event: {}", e)))?;
    
    // Check for failed entries
    let failed = result.failed_entry_count();
    if failed > 0 {
        return Err(JournalError::EventError(format!("{} events failed to publish", failed)));
    }
    
    Ok(())
}

// Settings module
mod settings;
pub use settings::*;

// Gamification module
pub mod gamification;
pub use gamification::*;

// AI module - conditionally compiled
#[cfg(feature = "ai-features")]
mod ai;
#[cfg(feature = "ai-features")]
pub use ai::*;

// Also export a simplified version without the heavy AI dependencies
#[cfg(not(feature = "ai-features"))]
mod ai;
#[cfg(not(feature = "ai-features"))]
pub use ai::*;
