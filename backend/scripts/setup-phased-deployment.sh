#!/bin/bash

# Import utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

# Check prerequisites
check_command "aws"
check_command "sam"
check_aws_credentials

# Create necessary directories
mkdir -p "$SCRIPT_DIR/../outputs"
mkdir -p "$SCRIPT_DIR/../../frontend/.env"

# Get Google OAuth credentials
log_info "Please enter your Google OAuth 2.0 credentials from the Google Cloud Console"
log_info "These credentials should be from a Web Application OAuth client"
log_info "You can find them at: https://console.cloud.google.com/apis/credentials"
echo
read -p "Enter Google OAuth Client ID: " GOOGLE_CLIENT_ID
read -s -p "Enter Google OAuth Client Secret: " GOOGLE_CLIENT_SECRET
echo

# Validate credentials format
if [[ ! "$GOOGLE_CLIENT_ID" =~ ^[0-9]+-[a-zA-Z0-9_]+\.apps\.googleusercontent\.com$ ]]; then
    log_error "Invalid Google Client ID format"
    log_info "Expected format: [0-9]+-[a-zA-Z0-9_]+.apps.googleusercontent.com"
    exit 1
fi

# Deploy core infrastructure
log_info "Deploying core infrastructure..."
./deploy-phased.sh \
  -p core \
  -g "$GOOGLE_CLIENT_ID" \
  -f

# Get Cognito details
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name reflekt-journal-dev-core \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name reflekt-journal-dev-core \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
  --output text)

API_URL=$(aws cloudformation describe-stacks \
  --stack-name reflekt-journal-dev-core \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

# Configure Cognito with Google provider
log_info "Configuring Cognito with Google provider..."
aws cognito-idp create-identity-provider \
  --user-pool-id "$USER_POOL_ID" \
  --provider-name Google \
  --provider-type Google \
  --provider-details "{\"client_id\":\"$GOOGLE_CLIENT_ID\",\"client_secret\":\"$GOOGLE_CLIENT_SECRET\",\"authorize_scopes\":\"openid email profile\"}" \
  --attribute-mapping "{\"email\":\"email\",\"name\":\"name\",\"picture\":\"picture\"}" \
  --idp-identifiers "Google"

# Update frontend environment
log_info "Updating frontend environment..."
cat > "$SCRIPT_DIR/../../frontend/.env.development" << EOF
REACT_APP_API_URL=$API_URL
REACT_APP_COGNITO_USER_POOL_ID=$USER_POOL_ID
REACT_APP_COGNITO_CLIENT_ID=$USER_POOL_CLIENT_ID
REACT_APP_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
EOF

log_success "Core infrastructure setup complete"
log_info "Next steps:"
log_info "1. Deploy primary services: ./deploy-phased.sh -p primary"
log_info "2. Test frontend integration"
log_info "3. Deploy enhanced services: ./deploy-phased.sh -p enhanced"
log_info "4. Deploy database: ./deploy-phased.sh -p database" 