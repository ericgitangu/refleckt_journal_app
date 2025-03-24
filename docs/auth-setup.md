# 🔒 Authentication Setup Guide

This guide explains how to set up authentication for the Reflekt Journal application using AWS Cognito and Google OAuth.

## Prerequisites

- AWS Account with appropriate permissions
- Google Cloud Project with OAuth 2.0 credentials
- AWS CLI configured with your credentials
- AWS SAM CLI installed

## AWS Cognito Setup

### 1. Deploy Core Infrastructure

The core infrastructure deployment script will create the necessary Cognito resources:

```bash
cd backend
./scripts/setup-phased-deployment.sh
```

This script will:
- Create a Cognito User Pool
- Create a User Pool Client
- Create an Identity Pool
- Configure Google as an identity provider
- Set up necessary IAM roles

### 2. Verify Cognito Resources

After deployment, verify the following resources were created:

```bash
# List User Pools
aws cognito-idp list-user-pools --max-results 10

# List User Pool Clients
aws cognito-idp list-user-pool-clients --user-pool-id YOUR_USER_POOL_ID

# List Identity Providers
aws cognito-idp list-identity-providers --user-pool-id YOUR_USER_POOL_ID
```

### 3. Configure Frontend Environment

The deployment script will automatically create a `.env.development` file in the frontend directory with the necessary Cognito configuration:

```env
REACT_APP_API_URL=<API_URL>
REACT_APP_COGNITO_USER_POOL_ID=<USER_POOL_ID>
REACT_APP_COGNITO_CLIENT_ID=<USER_POOL_CLIENT_ID>
REACT_APP_GOOGLE_CLIENT_ID=<GOOGLE_CLIENT_ID>
```

## Authentication Flow

1. **User Sign In**:
   - User clicks "Sign in with Google"
   - Frontend initiates Google OAuth flow
   - User authenticates with Google
   - Google redirects back with authorization code

2. **Token Exchange**:
   - Frontend sends code to backend
   - Backend exchanges code for tokens via Cognito
   - Cognito verifies with Google
   - User receives JWT tokens

3. **API Access**:
   - Frontend includes JWT in API requests
   - API Gateway validates token
   - Lambda functions receive authenticated request

## Security Considerations

1. **Token Management**:
   - JWT tokens are short-lived
   - Refresh tokens are securely stored
   - Tokens are transmitted over HTTPS only

2. **CORS Configuration**:
   - API Gateway configured with appropriate CORS headers
   - Frontend domain whitelisted
   - Google OAuth origins configured

3. **Error Handling**:
   - Invalid tokens return 401
   - Expired tokens trigger refresh flow
   - Failed authentication returns clear error messages

## Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Verify API Gateway CORS configuration
   - Check frontend domain in allowed origins
   - Ensure Google OAuth redirect URI is correct

2. **Token Validation Failures**:
   - Check token expiration
   - Verify token signature
   - Ensure correct issuer URL

3. **Google OAuth Issues**:
   - Verify Google Cloud Console configuration
   - Check authorized domains
   - Ensure OAuth consent screen is configured

### Debugging Tools

1. **AWS CLI Commands**:
   ```bash
   # Check User Pool status
   aws cognito-idp describe-user-pool --user-pool-id YOUR_USER_POOL_ID

   # List User Pool clients
   aws cognito-idp list-user-pool-clients --user-pool-id YOUR_USER_POOL_ID

   # Check Identity Provider configuration
   aws cognito-idp describe-identity-provider --user-pool-id YOUR_USER_POOL_ID --provider-name Google
   ```

2. **CloudWatch Logs**:
   - Check Lambda function logs for authentication failures
   - Monitor API Gateway logs for request/response details
   - Review Cognito authentication logs

## Next Steps

1. [Configure Google OAuth](google-oauth.md)
2. [Set up API Gateway authentication](api-gateway-auth.md)
3. [Implement frontend authentication](frontend-auth.md) 