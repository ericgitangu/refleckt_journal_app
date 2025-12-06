use aws_lambda_events::apigw::{
    ApiGatewayCustomAuthorizerPolicy, ApiGatewayCustomAuthorizerRequest,
    ApiGatewayCustomAuthorizerResponse,
};
use aws_lambda_events::event::iam::{IamPolicyStatement, IamPolicyEffect};
// Import lambda_runtime through common instead of directly
use journal_common::{
    lambda_runtime::{run, service_fn, Error, LambdaEvent},
    jwt::{Header, Token, VerifyWithKey},
    hmac::{Hmac, Mac},
    sha2::Sha256,
    chrono, serde_json
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct JwtClaims {
    sub: String,
    email: String,
    tenant_id: String,
    #[serde(default)]
    role: String,
    exp: i64,
    iat: i64,
}

async fn handler(
    event: LambdaEvent<ApiGatewayCustomAuthorizerRequest>,
) -> Result<ApiGatewayCustomAuthorizerResponse, Error> {
    // Extract token from request
    let token = match extract_token(&event.payload) {
        Ok(token) => token,
        Err(err) => {
            eprintln!("Error extracting token: {}", err);
            return Ok(unauthorized());
        }
    };
    
    // Validate token
    let jwt_secret = std::env::var("JWT_SECRET")
        .map_err(|_| "JWT_SECRET environment variable not set")?;
    
    let claims = match validate_token(&token, &jwt_secret) {
        Ok(claims) => claims,
        Err(err) => {
            eprintln!("Error validating token: {}", err);
            return Ok(unauthorized());
        }
    };
    
    // Create authorized response
    // Parse method ARN to extract account, region, api_id, and stage
    // Format: arn:aws:execute-api:{region}:{account-id}:{api-id}/{stage}/{method}/{resource}
    let method_arn = event.payload.method_arn.as_ref()
        .ok_or("Missing method_arn")?;

    let parts: Vec<&str> = method_arn.split(':').collect();
    let region = if parts.len() > 3 { parts[3] } else { "us-east-1" };
    let account_id = if parts.len() > 4 { parts[4] } else { "123456789012" };

    let path_parts: Vec<&str> = if parts.len() > 5 {
        parts[5].split('/').collect()
    } else {
        vec![]
    };
    let api_id = if !path_parts.is_empty() { path_parts[0] } else { "api-id" };
    let stage = if path_parts.len() > 1 { path_parts[1] } else { "prod" };

    // Resource: all resources (*) for this API
    let resource = format!(
        "arn:aws:execute-api:{}:{}:{}/{}/*",
        region, account_id, api_id, stage
    );
    
    // Create response
    let context_map = create_auth_context(&claims);
    let context_json = serde_json::to_value(context_map)
        .unwrap_or(serde_json::Value::Object(serde_json::Map::new()));

    let response = ApiGatewayCustomAuthorizerResponse {
        principal_id: Some(claims.sub.clone()),
        policy_document: ApiGatewayCustomAuthorizerPolicy {
            version: Some("2012-10-17".to_string()),
            statement: vec![IamPolicyStatement {
                effect: IamPolicyEffect::Allow,
                action: vec!["execute-api:Invoke".to_string()],
                resource: vec![resource],
                condition: None,
            }],
        },
        context: context_json,
        usage_identifier_key: None,
    };

    Ok(response)
}

fn extract_token(event: &ApiGatewayCustomAuthorizerRequest) -> Result<String, Error> {
    // Check if token is in the authorizationToken field
    if let Some(token) = &event.authorization_token {
        if token.starts_with("Bearer ") {
            return Ok(token[7..].to_string());
        }
        return Ok(token.to_string());
    }

    Err("No token found in request".into())
}

// Update the validate_token function to use the new JWT implementation
fn validate_token(token: &str, secret: &str) -> Result<JwtClaims, Error> {
    // Create a HMAC-SHA256 key
    type HmacSha256 = Hmac<Sha256>;
    let key = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|e| format!("Invalid key: {}", e))?;
    
    // Parse and verify the token
    let verified_token = Token::<Header, JwtClaims, _>::parse_unverified(token)
        .map_err(|e| format!("Invalid token format: {}", e))?
        .verify_with_key(&key)
        .map_err(|e| format!("Invalid token signature: {}", e))?;
    
    // Get claims from the token
    let claims = verified_token.claims().clone();
    
    // Check expiration
    let now = chrono::Utc::now().timestamp();
    if claims.exp < now {
        return Err("Token expired".into());
    }
    
    Ok(claims)
}

fn create_auth_context(claims: &JwtClaims) -> HashMap<String, String> {
    let mut context = HashMap::new();
    
    context.insert("sub".to_string(), claims.sub.clone());
    context.insert("email".to_string(), claims.email.clone());
    context.insert("tenant_id".to_string(), claims.tenant_id.clone());
    context.insert("role".to_string(), claims.role.clone());
    
    context
}

fn unauthorized() -> ApiGatewayCustomAuthorizerResponse {
    ApiGatewayCustomAuthorizerResponse {
        principal_id: Some("unauthorized".to_string()),
        policy_document: ApiGatewayCustomAuthorizerPolicy {
            version: Some("2012-10-17".to_string()),
            statement: vec![IamPolicyStatement {
                effect: IamPolicyEffect::Deny,
                action: vec!["execute-api:Invoke".to_string()],
                resource: vec!["*".to_string()],
                condition: None,
            }],
        },
        context: serde_json::Value::Object(serde_json::Map::new()),
        usage_identifier_key: None,
    }
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    run(service_fn(handler)).await
}
