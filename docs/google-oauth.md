# 🔑 Google OAuth Configuration Guide

This guide explains how to set up Google OAuth for the Reflekt Journal application.

## Prerequisites

- Google Cloud Platform account
- AWS Cognito User Pool (created in [auth-setup.md](auth-setup.md))
- Frontend application running locally or deployed

## Google Cloud Console Setup

### 1. Create a Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" at the top
3. Click "New Project"
4. Enter a project name (e.g., "Reflekt Journal")
5. Click "Create"

### 2. Enable APIs

1. In the left sidebar, click "APIs & Services" > "Library"
2. Search for and enable these APIs:
   - Google+ API
   - Google People API
   - Google OAuth2 API

### 3. Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type
3. Fill in the required information:
   - App name: "Reflekt Journal"
   - User support email: Your email
   - Developer contact information: Your email
4. Click "Save and Continue"
5. Add scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
6. Click "Save and Continue"
7. Add test users (your email)
8. Click "Save and Continue"

### 4. Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application"
4. Name: "Reflekt Journal Web Client"
5. Add authorized JavaScript origins:
   ```
   http://localhost:3000
   https://your-production-domain.com
   ```
6. Add authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/callback/google
   https://your-production-domain.com/api/auth/callback/google
   ```
7. Click "Create"
8. Note down your Client ID and Client Secret

## Configure Cognito with Google

### 1. Add Google as Identity Provider

The `setup-phased-deployment.sh` script will automatically configure Google as an identity provider in Cognito. If you need to do it manually:

```bash
aws cognito-idp create-identity-provider \
  --user-pool-id YOUR_USER_POOL_ID \
  --provider-name Google \
  --provider-type Google \
  --provider-details "{\"client_id\":\"YOUR_GOOGLE_CLIENT_ID\",\"client_secret\":\"YOUR_GOOGLE_CLIENT_SECRET\",\"authorize_scopes\":\"openid email profile\"}" \
  --attribute-mapping "{\"email\":\"email\",\"name\":\"name\",\"picture\":\"picture\"}" \
  --idp-identifiers "Google"
```

### 2. Configure User Pool Client

1. Go to AWS Console > Cognito > User Pools
2. Select your User Pool
3. Go to "App integration" > "App client settings"
4. Enable Google under "Identity providers"
5. Configure OAuth flows:
   - Authorization code grant
   - Implicit grant
6. Add callback URLs:
   ```
   http://localhost:3000/api/auth/callback/google
   https://your-production-domain.com/api/auth/callback/google
   ```
7. Add logout URLs:
   ```
   http://localhost:3000
   https://your-production-domain.com
   ```

## Frontend Configuration

### 1. Environment Variables

The deployment script will automatically create a `.env.development` file with the necessary configuration:

```env
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
REACT_APP_COGNITO_USER_POOL_ID=your_user_pool_id
REACT_APP_COGNITO_CLIENT_ID=your_cognito_client_id
```

### 2. Google Sign-In Button

Example implementation of the Google sign-in button:

```tsx
import { useAuth } from '../hooks/useAuth';

export function GoogleSignInButton() {
  const { signInWithGoogle } = useAuth();

  return (
    <button
      onClick={signInWithGoogle}
      className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
    >
      <img
        src="/google-icon.svg"
        alt="Google"
        className="w-5 h-5 mr-2"
      />
      Continue with Google
    </button>
  );
}
```

## Testing the Integration

1. Start your frontend application:
   ```bash
   cd frontend
   yarn dev
   ```

2. Navigate to the login page
3. Click "Continue with Google"
4. Complete the Google sign-in flow
5. Verify you're redirected back to your application
6. Check that your user profile is loaded

## Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Verify Google OAuth origins in Google Cloud Console
   - Check Cognito callback URLs
   - Ensure frontend domain is whitelisted

2. **Callback Failures**:
   - Verify redirect URIs match exactly
   - Check browser console for errors
   - Ensure HTTPS is used in production

3. **Profile Data Missing**:
   - Verify OAuth scopes are configured
   - Check attribute mapping in Cognito
   - Ensure Google People API is enabled

### Debugging Tools

1. **Google Cloud Console**:
   - Check OAuth consent screen configuration
   - Verify API enablement
   - Review OAuth credentials

2. **AWS Console**:
   - Check Cognito User Pool settings
   - Verify identity provider configuration
   - Review CloudWatch logs

## Security Best Practices

1. **Client Secrets**:
   - Never expose client secrets in frontend code
   - Use environment variables
   - Rotate secrets regularly

2. **Token Handling**:
   - Store tokens securely
   - Implement proper token refresh
   - Clear tokens on logout

3. **Error Handling**:
   - Implement proper error states
   - Log authentication failures
   - Provide user-friendly error messages

## Next Steps

1. [Set up API Gateway authentication](api-gateway-auth.md)
2. [Implement frontend authentication](frontend-auth.md)
3. [Configure user profile management](user-profile.md) 