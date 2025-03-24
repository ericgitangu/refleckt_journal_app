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
ENABLE_KMS=false
TAGS=""
CLEANUP_ON_FAILURE=true
ESTIMATE_COST=false

# Parse command-line arguments
while getopts "n:s:r:b:j:k:t:cf:e" opt; do
  case $opt in
    n) STACK_NAME="$OPTARG" ;;
    s) STAGE="$OPTARG" ;;
    r) REGION="$OPTARG" ;;
    b) DEPLOY_BUCKET="$OPTARG" ;;
    j) JWT_SECRET="$OPTARG" ;;
    k) ENABLE_KMS=true ;;
    t) TAGS="$OPTARG" ;;
    c) CLEANUP_ON_FAILURE=false ;;
    f) FORCE_DEPLOY=true ;;
    e) ESTIMATE_COST=true ;;
    \?) log_error "Invalid option: -$OPTARG"; exit 1 ;;
  esac
done

# Validate inputs
validate_stack_name "$STACK_NAME"
validate_aws_region "$REGION"

# Get the project root
PROJECT_ROOT=$(get_project_root)
TEMPLATE_PATH="$PROJECT_ROOT/infrastructure/template.yaml"

# Check if template exists
if [ ! -f "$TEMPLATE_PATH" ]; then
  fail "Template file not found at $TEMPLATE_PATH"
fi

# Generate deployment tags
if [ -z "$TAGS" ]; then
  TAGS="Stage=$STAGE,Project=ReflektJournal,ManagedBy=Script,DeploymentDate=$(date +%Y-%m-%d)"
fi

log_info "Deploying stack: $STACK_NAME, Stage: $STAGE, Region: $REGION"

# If no deploy bucket is provided, create one
if [ -z "$DEPLOY_BUCKET" ]; then
  DEPLOY_BUCKET="${STACK_NAME}-${STAGE}-deploy-$(date +%s)"
  log_info "Creating S3 bucket for deployment: $DEPLOY_BUCKET"
  
  # Create bucket with encryption
  if ! aws s3 mb "s3://$DEPLOY_BUCKET" --region "$REGION"; then
    fail "Failed to create S3 bucket"
  fi
  
  # Enable bucket encryption
  aws s3api put-bucket-encryption \
    --bucket "$DEPLOY_BUCKET" \
    --server-side-encryption-configuration '{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}'
  
  # Add tags to bucket
  aws s3api put-bucket-tagging \
    --bucket "$DEPLOY_BUCKET" \
    --tagging "TagSet=[$(echo "$TAGS" | sed 's/,/},{/g' | sed 's/=/":"/g' | sed 's/^/{/;s/$/}/')]"
else
  # Check if bucket exists
  if ! aws s3 ls "s3://$DEPLOY_BUCKET" >/dev/null 2>&1; then
    fail "Deployment bucket does not exist: $DEPLOY_BUCKET"
  fi
fi

# Handle JWT secret securely
if [ -z "$JWT_SECRET" ]; then
  if [ -z "$JWT_SECRET_ENV" ]; then
    if [ "$ENABLE_KMS" = true ]; then
      # Generate and encrypt JWT secret using KMS
      JWT_SECRET=$(aws kms generate-data-key \
        --key-id "alias/${STACK_NAME}-${STAGE}-jwt" \
        --key-spec AES_256 \
        --region "$REGION" \
        --output text \
        --query Plaintext)
    else
      JWT_SECRET=$(openssl rand -hex 32)
      log_warning "No JWT secret provided. Generated random secret (not encrypted)."
    fi
  else
    JWT_SECRET="$JWT_SECRET_ENV"
  fi
fi

# Estimate deployment cost if requested
if [ "$ESTIMATE_COST" = true ]; then
  log_info "Estimating deployment cost..."
  sam estimate-cost \
    --template-file "$TEMPLATE_PATH" \
    --region "$REGION" \
    --parameter-overrides "Stage=$STAGE JwtSecret=$JWT_SECRET" \
    --output json
fi

# Build the application
log_info "Building application"
run_cmd "sam build --template-file $TEMPLATE_PATH" || fail "SAM build failed"

# Deploy the application with enhanced options
log_info "Deploying application"
DEPLOY_CMD="sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name $STACK_NAME-$STAGE \
  --s3-bucket $DEPLOY_BUCKET \
  --capabilities CAPABILITY_IAM \
  --region $REGION \
  --parameter-overrides Stage=$STAGE JwtSecret=$JWT_SECRET \
  --tags $TAGS \
  --no-fail-on-empty-changeset"

if [ "$FORCE_DEPLOY" = true ]; then
  DEPLOY_CMD="$DEPLOY_CMD --force-upload"
fi

# Set up error handling for deployment
set -e
trap 'handle_deployment_failure' ERR

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

# Function to handle deployment failures
handle_deployment_failure() {
  local exit_code=$?
  
  if [ "$CLEANUP_ON_FAILURE" = true ]; then
    log_warning "Deployment failed. Cleaning up resources..."
    
    # Delete the stack
    aws cloudformation delete-stack \
      --stack-name "$STACK_NAME-$STAGE" \
      --region "$REGION"
    
    # Wait for stack deletion
    aws cloudformation wait stack-delete-complete \
      --stack-name "$STACK_NAME-$STAGE" \
      --region "$REGION"
    
    log_info "Cleanup complete"
  else
    log_warning "Deployment failed. Resources will be preserved for debugging."
  fi
  
  exit $exit_code
} 