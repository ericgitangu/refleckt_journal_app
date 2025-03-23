# Authentication Setup Guide

This guide explains how to set up authentication for the Reflekt Journal application using AWS Cognito and Google OAuth.

## Prerequisites

1. An AWS account with appropriate permissions
2. A Google Cloud Platform account
3. The AWS CLI installed and configured
4. Basic knowledge of AWS CloudFormation

## Google OAuth Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" and select "OAuth client ID"
5. Select "Web application" as the application type
6. Add your application name
7. Add authorized JavaScript origins:
   - For local development: `http://localhost:3000`
   - For production: `https://your-production-domain.com`
8. Add authorized redirect URIs:
   - For local development: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://your-production-domain.com/api/auth/callback/google`
9. Click "Create" and note down your Client ID and Client Secret

## AWS Cognito Setup

### Using CloudFormation

1. Navigate to the `backend/infrastructure` directory
2. Deploy the Cognito stack using AWS CLI:

```bash
aws cloudformation deploy \
  --template-file cognito.yaml \
  --stack-name reflekt-auth-stack \
  --parameter-overrides \
    Stage=dev \
    GoogleClientId=YOUR_GOOGLE_CLIENT_ID \
    GoogleClientSecret=YOUR_GOOGLE_CLIENT_SECRET \
    CallbackURL=http://localhost:3000/api/auth/callback/cognito \
  --capabilities CAPABILITY_IAM
```

3. After deployment, get the stack outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name reflekt-auth-stack \
  --query "Stacks[0].Outputs"
```

4. Note down the following values:
   - UserPoolId
   - UserPoolClientId
   - UserPoolDomain
   - CognitoProviderURL

### Manual Setup (Alternative)

If you prefer to set up Cognito manually:

1. Go to the AWS Management Console and navigate to the Cognito service
2. Create a new User Pool:
   - Configure sign-in experience: Select email as a sign-in option
   - Configure security requirements: Set password policy as needed
   - Configure self-service sign-up: Enable self-registration
   - Configure message delivery: Use Cognito defaults for email
   - Integrate your app: Name your user pool "reflekt-user-pool-{stage}"
3. Create a new app client:
   - Set app type as "Confidential client"
   - Generate a client secret
   - Configure the callback URLs and allowed OAuth flows
4. Add Google as an identity provider:
   - Use the Google Client ID and Secret from the previous section
   - Configure attribute mapping (email, name, picture)
5. Set up a domain name for your Cognito User Pool

## Environment Configuration

Update your `.env` file with the following information:

```
# AWS Cognito Configuration
COGNITO_CLIENT_ID=your_cognito_app_client_id
COGNITO_CLIENT_SECRET=your_cognito_app_client_secret
COGNITO_ISSUER=https://cognito-idp.{region}.amazonaws.com/{user_pool_id}

# Google OAuth Configuration
GOOGLE_ID=your_google_client_id
GOOGLE_SECRET=your_google_client_secret
```

## Testing Authentication

1. Start your application in development mode: `npm run dev`
2. Navigate to `/login` in your browser
3. Try signing in with both Cognito and Google options
4. Test the protected routes to ensure they require authentication

## Troubleshooting

### CORS Issues

If you encounter CORS issues with Cognito:

1. Go to your User Pool in the AWS Console
2. Navigate to the "App integration" tab
3. Under "App clients and analytics," select your app client
4. Verify that the Allowed callback URLs and Allowed sign-out URLs are correct

### OAuth Callback Problems

If the OAuth callback isn't working:

1. Double-check the callback URLs in both Google Console and Cognito settings
2. Ensure your `NEXTAUTH_URL` environment variable is correctly set
3. Check browser console for any errors during the authentication flow

### JWT Token Issues

If you have issues with JWT validation:

1. Verify that `NEXTAUTH_SECRET` is correctly set in your environment
2. Ensure the Cognito issuer URL is correct in your auth settings 