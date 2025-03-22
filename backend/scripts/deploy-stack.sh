#!/bin/bash

# Import utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

# Check for required tools
check_command "aws"
check_sam_cli
check_aws_credentials

# Default values
STACK_NAME="reflekt-journal"
STAGE="dev"
REGION="us-east-1"
DEPLOY_BUCKET=""
JWT_SECRET=""

# Parse command-line arguments
while getopts "n:s:r:b:j:" opt; do
  case $opt in
    n) STACK_NAME="$OPTARG" ;;
    s) STAGE="$OPTARG" ;;
    r) REGION="$OPTARG" ;;
    b) DEPLOY_BUCKET="$OPTARG" ;;
    j) JWT_SECRET="$OPTARG" ;;
    \?) log_error "Invalid option: -$OPTARG"; exit 1 ;;
  esac
done

# Validate required parameters
if [ -z "$JWT_SECRET" ]; then
  if [ -z "$JWT_SECRET_ENV" ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    log_warning "No JWT secret provided. Generated random secret: $JWT_SECRET"
  else
    JWT_SECRET="$JWT_SECRET_ENV"
  fi
fi

# Get the project root
PROJECT_ROOT=$(get_project_root)
TEMPLATE_PATH="$PROJECT_ROOT/infrastructure/template.yaml"

# Check if template exists
if [ ! -f "$TEMPLATE_PATH" ]; then
  fail "Template file not found at $TEMPLATE_PATH"
fi

log_info "Deploying stack: $STACK_NAME, Stage: $STAGE, Region: $REGION"

# If no deploy bucket is provided, create one
if [ -z "$DEPLOY_BUCKET" ]; then
  DEPLOY_BUCKET="${STACK_NAME}-${STAGE}-deploy-$(date +%s)"
  log_info "Creating S3 bucket for deployment: $DEPLOY_BUCKET"
  if ! aws s3 mb "s3://$DEPLOY_BUCKET" --region "$REGION"; then
    fail "Failed to create S3 bucket"
  fi
else
  # Check if bucket exists
  if ! aws s3 ls "s3://$DEPLOY_BUCKET" >/dev/null 2>&1; then
    fail "Deployment bucket does not exist: $DEPLOY_BUCKET"
  fi
fi

# Build the application
log_info "Building application"
run_cmd "sam build --template-file $TEMPLATE_PATH" || fail "SAM build failed"

# Deploy the application
log_info "Deploying application"
DEPLOY_CMD="sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name $STACK_NAME-$STAGE \
  --s3-bucket $DEPLOY_BUCKET \
  --capabilities CAPABILITY_IAM \
  --region $REGION \
  --parameter-overrides Stage=$STAGE JwtSecret=$JWT_SECRET \
  --no-fail-on-empty-changeset"

run_cmd "$DEPLOY_CMD" || fail "SAM deploy failed"

# Get stack outputs
log_info "Getting stack outputs"
STACK_OUTPUTS=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME-$STAGE" \
  --region "$REGION" \
  --query "Stacks[0].Outputs" \
  --output json)

# Extract API URL from stack outputs
API_URL=$(echo "$STACK_OUTPUTS" | jq -r '.[] | select(.OutputKey=="JournalApiUrl") | .OutputValue')

if [ -z "$API_URL" ]; then
  log_warning "API URL not found in stack outputs"
else
  log_info "API URL: $API_URL"
  
  # Test API endpoints
  log_info "Testing API endpoints"
  
  # Wait for API to become available
  wait_for_endpoint "$API_URL/health" 60 5
  
  # Test individual endpoints
  ENDPOINTS=(
    "entries"
    "settings"
    "analytics"
    "settings/categories"
  )
  
  for endpoint in "${ENDPOINTS[@]}"; do
    if wait_for_endpoint "$API_URL/$endpoint" 10 2; then
      log_success "Endpoint $endpoint is available"
    else
      log_warning "Endpoint $endpoint is not available"
    fi
  done
fi

log_success "Stack deployment and testing complete" 