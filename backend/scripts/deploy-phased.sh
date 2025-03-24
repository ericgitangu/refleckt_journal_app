#!/bin/bash

# Import utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

# Default values
STACK_NAME="reflekt-journal"
STAGE="dev"
REGION="us-east-1"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
PHASE="all"
SKIP_FRONTEND_TEST=false

# Parse command-line arguments
while getopts "n:s:r:g:p:f" opt; do
  case $opt in
    n) STACK_NAME="$OPTARG" ;;
    s) STAGE="$OPTARG" ;;
    r) REGION="$OPTARG" ;;
    g) GOOGLE_CLIENT_ID="$OPTARG" ;;
    p) PHASE="$OPTARG" ;;
    f) SKIP_FRONTEND_TEST=true ;;
    \?) log_error "Invalid option: -$OPTARG"; exit 1 ;;
  esac
done

# Validate inputs
validate_stack_name "$STACK_NAME"
validate_aws_region "$REGION"

# Function to deploy a specific phase
deploy_phase() {
  local phase=$1
  local stack_name="$STACK_NAME-$STAGE-$phase"
  
  log_info "Deploying phase: $phase"
  
  # Deploy the phase
  ./deploy-stack.sh \
    -n "$stack_name" \
    -s "$STAGE" \
    -r "$REGION" \
    -k \
    -t "Phase=$phase,Project=ReflektJournal,ManagedBy=Script"
  
  # Get stack outputs
  local outputs=$(aws cloudformation describe-stacks \
    --stack-name "$stack_name" \
    --region "$REGION" \
    --query "Stacks[0].Outputs" \
    --output json)
  
  # Save outputs to a file
  echo "$outputs" > "$SCRIPT_DIR/../outputs/$phase-outputs.json"
  
  # Extract and display important outputs
  log_info "Phase $phase outputs:"
  echo "$outputs" | jq -r '.[] | "\(.OutputKey): \(.OutputValue)"'
  
  # Test the deployed endpoints
  if [ "$SKIP_FRONTEND_TEST" = false ]; then
    test_frontend_integration "$phase" "$outputs"
  fi
}

# Function to test frontend integration
test_frontend_integration() {
  local phase=$1
  local outputs=$2
  
  log_info "Testing frontend integration for phase: $phase"
  
  # Extract API URL and Cognito details
  local api_url=$(echo "$outputs" | jq -r '.[] | select(.OutputKey=="JournalApiUrl") | .OutputValue')
  local cognito_pool_id=$(echo "$outputs" | jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue')
  local cognito_client_id=$(echo "$outputs" | jq -r '.[] | select(.OutputKey=="UserPoolClientId") | .OutputValue')
  
  # Update frontend environment variables
  update_frontend_env "$phase" "$api_url" "$cognito_pool_id" "$cognito_client_id"
  
  # Run frontend tests
  run_frontend_tests "$phase"
}

# Function to update frontend environment variables
update_frontend_env() {
  local phase=$1
  local api_url=$2
  local cognito_pool_id=$3
  local cognito_client_id=$4
  
  local env_file="$SCRIPT_DIR/../../frontend/.env.$STAGE"
  
  # Create or update environment file
  cat > "$env_file" << EOF
REACT_APP_API_URL=$api_url
REACT_APP_COGNITO_USER_POOL_ID=$cognito_pool_id
REACT_APP_COGNITO_CLIENT_ID=$cognito_client_id
REACT_APP_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
EOF
  
  log_info "Updated frontend environment variables for $STAGE"
}

# Function to run frontend tests
run_frontend_tests() {
  local phase=$1
  
  log_info "Running frontend tests for phase: $phase"
  
  # Navigate to frontend directory
  cd "$SCRIPT_DIR/../../frontend" || fail "Failed to navigate to frontend directory"
  
  # Install dependencies if needed
  if [ ! -d "node_modules" ]; then
    yarn install
  fi
  
  # Run tests
  yarn test
  
  # Return to scripts directory
  cd "$SCRIPT_DIR" || fail "Failed to return to scripts directory"
}

# Create outputs directory
mkdir -p "$SCRIPT_DIR/../outputs"

# Deploy based on phase
case $PHASE in
  "core")
    deploy_phase "core"
    ;;
  "primary")
    deploy_phase "core"
    deploy_phase "primary"
    ;;
  "enhanced")
    deploy_phase "core"
    deploy_phase "primary"
    deploy_phase "enhanced"
    ;;
  "all")
    deploy_phase "core"
    deploy_phase "primary"
    deploy_phase "enhanced"
    deploy_phase "database"
    ;;
  *)
    fail "Invalid phase: $PHASE. Must be one of: core, primary, enhanced, all"
    ;;
esac

log_success "Phased deployment complete" 