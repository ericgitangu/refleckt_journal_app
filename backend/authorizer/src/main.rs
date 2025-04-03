use aws_lambda_events::apigw::{
    ApiGatewayCustomAuthorizerPolicy, ApiGatewayCustomAuthorizerRequest,
    ApiGatewayCustomAuthorizerResponse, IamPolicyStatement,
};
use aws_lambda_runtime::{run, service_fn, Error, LambdaEvent};
// Replace jsonwebtoken with jwt and openssl
// use jsonwebtoken::{decode, DecodingKey, Validation};
use jwt::{Claims, Header, Token, VerifyWithKey};
use openssl::{hash::MessageDigest, pkey::PKey, sign::Verifier};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
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
    let account_id = std::env::var("AWS_ACCOUNT_ID")
        .unwrap_or_else(|_| "123456789012".to_string());
    
    let region = std::env::var("AWS_REGION")
        .unwrap_or_else(|_| "us-east-1".to_string());
    
    let api_id = event.payload.request_context.api_id
        .unwrap_or_else(|| "api-id".to_string());
    
    let stage = event.payload.request_context.stage
        .unwrap_or_else(|| "prod".to_string());
    
    // Effect: Allow
    let effect = "Allow";
    
    // Resource: all resources (*) for this API
    let resource = format!(
        "arn:aws:execute-api:{}:{}:{}/{}/*/",
        region, account_id, api_id, stage
    );
    
    // Create response
    let response = ApiGatewayCustomAuthorizerResponse {
        principal_id: claims.sub.clone(),
        policy_document: ApiGatewayCustomAuthorizerPolicy {
            version: "2012-10-17".to_string(),
            statement: vec![IamPolicyStatement {
                effect: effect.to_string(),
                action: vec!["execute-api:Invoke".to_string()],
                resource: vec![resource],
            }],
        },
        context: create_auth_context(&claims),
        usage_identifier_key: None,
    };
    
    Ok(response)
}

fn extract_token(event: &ApiGatewayCustomAuthorizerRequest) -> Result<String, Error> {
    // Check if token is in Authorization header
    if let Some(auth_header) = event.headers.get("Authorization") {
        if auth_header.starts_with("Bearer ") {
            return Ok(auth_header[7..].to_string());
        }
    }
    
    // Check if token is in query string parameters
    if let Some(token) = event.query_string_parameters.get("token") {
        return Ok(token.to_string());
    }
    
    // Check if token is in the authorizationToken field
    if let Some(token) = &event.authorization_token {
        if token.starts_with("Bearer ") {
            return Ok(token[7..].to_string());
        }
        return Ok(token.to_string());
    }
    
    Err("No token found in request".into())
}

// Updated validate_token function to use jwt crate with OpenSSL
fn validate_token(token: &str, secret: &str) -> Result<JwtClaims, Error> {
    // Create key from secret
    let key = PKey::hmac(secret.as_bytes())
        .map_err(|e| format!("Invalid key: {}", e))?;
    
    // Parse the token
    let token: Token<Header, JwtClaims, _> = Token::parse(token)
        .map_err(|e| format!("Invalid token format: {}", e))?;
    
    // Verify the token
    let claims = token.verify_with_key(&key)
        .map_err(|e| format!("Invalid token signature: {}", e))?;
    
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
        principal_id: "unauthorized".to_string(),
        policy_document: ApiGatewayCustomAuthorizerPolicy {
            version: "2012-10-17".to_string(),
            statement: vec![IamPolicyStatement {
                effect: "Deny".to_string(),
                action: vec!["execute-api:Invoke".to_string()],
                resource: vec!["*".to_string()],
            }],
        },
        context: HashMap::new(),
        usage_identifier_key: None,
    }
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    run(service_fn(handler)).await
}
