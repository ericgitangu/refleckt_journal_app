# 🔐 API Gateway Authentication Guide

This guide explains how to set up API Gateway authentication with AWS Cognito for the Reflekt Journal application.

## Prerequisites

- AWS Cognito User Pool (created in [auth-setup.md](auth-setup.md))
- AWS SAM CLI installed
- Backend services deployed

## API Gateway Setup

### 1. Configure Cognito Authorizer

The core infrastructure deployment script will automatically create the API Gateway with Cognito authorizer. If you need to do it manually:

```yaml
# In template-core.yaml
Resources:
  ApiGateway:
    Type: AWS::ApiGateway::RestApi
    Properties:
      Name: !Sub ${AWS::StackName}-api
      Description: API Gateway for Reflekt Journal
      EndpointConfiguration:
        Types:
          - REGIONAL

  CognitoAuthorizer:
    Type: AWS::ApiGateway::Authorizer
    Properties:
      Name: !Sub ${AWS::StackName}-cognito-authorizer
      Type: COGNITO_USER_POOLS
      IdentitySource: method.request.header.Authorization
      RestApiId: !Ref ApiGateway
      ProviderARNs:
        - !GetAtt UserPool.Arn
```

### 2. Configure API Methods

Each API method needs to be configured with the Cognito authorizer:

```yaml
# Example for a protected endpoint
Resources:
  GetEntriesMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref ApiGateway
      ResourceId: !Ref EntriesResource
      HttpMethod: GET
      AuthorizationType: COGNITO_USER_POOLS
      AuthorizerId: !Ref CognitoAuthorizer
      Integration:
        Type: AWS_PROXY
        IntegrationHttpMethod: POST
        Uri: !Sub arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${GetEntriesFunction.Arn}/invocations
```

### 3. Configure CORS

Enable CORS for your API endpoints:

```yaml
Resources:
  OptionsMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref ApiGateway
      ResourceId: !Ref EntriesResource
      HttpMethod: OPTIONS
      AuthorizationType: NONE
      Integration:
        Type: MOCK
        IntegrationResponses:
          - StatusCode: 200
            ResponseParameters:
              method.response.header.Access-Control-Allow-Headers: "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
              method.response.header.Access-Control-Allow-Methods: "'GET,POST,PUT,DELETE,OPTIONS'"
              method.response.header.Access-Control-Allow-Origin: "'*'"
              method.response.header.Access-Control-Max-Age: "'3600'"
        RequestTemplates:
          application/json: '{"statusCode": 200}'
        ResponseTemplates:
          application/json: ''
      MethodResponses:
        - StatusCode: 200
          ResponseParameters:
            method.response.header.Access-Control-Allow-Headers: true
            method.response.header.Access-Control-Allow-Methods: true
            method.response.header.Access-Control-Allow-Origin: true
            method.response.header.Access-Control-Max-Age: true
```

## Frontend Integration

### 1. API Client Setup

Configure your API client to include the authorization token:

```typescript
// lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

// Add request interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('idToken');
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

// Add response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh or redirect to login
      await refreshToken();
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 2. Token Management

Implement token refresh logic:

```typescript
// lib/auth.ts
export async function refreshToken() {
  try {
    const session = await Auth.currentSession();
    const idToken = session.getIdToken().getJwtToken();
    localStorage.setItem('idToken', idToken);
    return idToken;
  } catch (error) {
    // Handle refresh failure
    await signOut();
    throw error;
  }
}
```

## Testing Authentication

### 1. Test Protected Endpoints

```bash
# Get a valid token
TOKEN=$(aws cognito-idp admin-initiate-auth \
  --user-pool-id YOUR_USER_POOL_ID \
  --client-id YOUR_CLIENT_ID \
  --auth-flow ADMIN_NO_SRP_AUTH \
  --auth-parameters USERNAME=test@example.com,PASSWORD=password \
  --query 'AuthenticationResult.IdToken' \
  --output text)

# Test API endpoint
curl -X GET \
  https://your-api-url/entries \
  -H "Authorization: $TOKEN"
```

### 2. Test CORS

```bash
# Test OPTIONS request
curl -X OPTIONS \
  https://your-api-url/entries \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**:
   - Check token expiration
   - Verify token format
   - Ensure correct authorization header

2. **CORS Errors**:
   - Verify allowed origins
   - Check preflight requests
   - Ensure OPTIONS method is configured

3. **Integration Errors**:
   - Check Lambda permissions
   - Verify integration type
   - Review CloudWatch logs

### Debugging Tools

1. **API Gateway Console**:
   - Test API methods
   - Check authorization settings
   - Review request/response logs

2. **CloudWatch Logs**:
   - Monitor API Gateway logs
   - Check Lambda execution logs
   - Review authorization failures

## Security Best Practices

1. **Token Validation**:
   - Verify token signature
   - Check token expiration
   - Validate token claims

2. **CORS Configuration**:
   - Restrict allowed origins
   - Limit allowed methods
   - Set appropriate max age

3. **Error Handling**:
   - Return appropriate status codes
   - Log security events
   - Implement rate limiting

## Next Steps

1. [Implement frontend authentication](frontend-auth.md)
2. [Configure user profile management](user-profile.md)
3. [Set up monitoring and alerts](monitoring.md) 