#!/bin/bash
set -eo pipefail

# Script constants
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
SCRIPTS_DIR="$BACKEND_DIR/scripts"
LOG_DIR="$BACKEND_DIR/init-logs"
ENV_FILE="$BACKEND_DIR/.env"
TOKEN_FILE="$BACKEND_DIR/.token"
STACK_NAME=${STACK_NAME:-reflekt-journal}
STAGE=${STAGE:-dev}
REGION=${AWS_REGION:-us-east-1}

# Include utility functions from scripts directory
source "$SCRIPTS_DIR/utils.sh"

# Create logs directory
mkdir -p "$LOG_DIR"
rm -rf "$LOG_DIR"/*

########################################
# Helper Functions
########################################

log_info() {
    echo -e "\033[0;34m[INFO]\033[0m $1"
}

log_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

log_warning() {
    echo -e "\033[0;33m[WARNING]\033[0m $1"
}

log_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check for AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check for AWS SAM CLI
    if ! command -v sam &> /dev/null; then
        log_error "AWS SAM CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check for jq
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed. Please install it first."
        exit 1
    fi
    
    # Verify AWS credentials are configured
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log_error "AWS credentials not configured. Please run 'aws configure' or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables."
        exit 1
    fi
    
    log_success "All prerequisites checked."
}

setup_aws_credentials() {
    log_info "Setting up AWS credentials..."
    
    # First, check if credentials are already in environment
    if [ -n "${AWS_ACCESS_KEY_ID:-}" ] && [ -n "${AWS_SECRET_ACCESS_KEY:-}" ]; then
        log_success "Using AWS credentials from environment variables"
        return 0
    fi
    
    # Next, check if AWS CLI is configured with credentials
    if aws sts get-caller-identity &>/dev/null; then
        log_success "Using AWS credentials from AWS CLI configuration"
        return 0
    fi
    
    # If we're here, no credentials were found
    log_error "No AWS credentials found. Please configure AWS CLI or set environment variables."
    log_error "Run 'aws configure' or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables."
    exit 1
}

build_services() {
    log_info "Building all services..."
    
    # Run the build-all.sh script
    if [ -f "$SCRIPTS_DIR/build-all.sh" ]; then
        bash "$SCRIPTS_DIR/build-all.sh" 2>&1 | tee "$LOG_DIR/build-all.log"
        if [ ${PIPESTATUS[0]} -ne 0 ]; then
            log_error "Service build failed. Check $LOG_DIR/build-all.log for details."
            exit 1
        fi
    else
        log_error "build-all.sh script not found in $SCRIPTS_DIR"
        exit 1
    fi
    
    log_success "All services built successfully."
}

deploy_stack() {
    log_info "Deploying CloudFormation stack..."
    
    # Run the deploy-stack.sh script with appropriate parameters
    if [ -f "$SCRIPTS_DIR/deploy-stack.sh" ]; then
        bash "$SCRIPTS_DIR/deploy-stack.sh" -s "$STAGE" -r "$REGION" -n "$STACK_NAME" 2>&1 | tee "$LOG_DIR/deploy-stack.log"
        if [ ${PIPESTATUS[0]} -ne 0 ]; then
            log_error "Stack deployment failed. Check $LOG_DIR/deploy-stack.log for details."
            exit 1
        fi
    else
        log_error "deploy-stack.sh script not found in $SCRIPTS_DIR"
        exit 1
    fi
    
    log_success "Stack deployed successfully."
}

get_stack_outputs() {
    log_info "Fetching CloudFormation stack outputs..."
    
    local stack_output
    stack_output=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
        --output text 2>"$LOG_DIR/stack_outputs_error.log")
    
    if [ $? -ne 0 ]; then
        log_error "Failed to fetch stack outputs. Check $LOG_DIR/stack_outputs_error.log"
        cat "$LOG_DIR/stack_outputs_error.log"
        exit 1
    fi
    
    echo "$stack_output" > "$LOG_DIR/stack_outputs.txt"
    echo "$stack_output"
}

update_env_file() {
    local stack_output="$1"
    local env_tmp="${ENV_FILE}.tmp"
    
    log_info "Updating environment file..."
    
    # Start with empty environment file
    : > "$env_tmp"
    
    # Extract API Gateway endpoint and other outputs
    while IFS=$'\t' read -r key value; do
        case "$key" in
            "ApiEndpoint")
                echo "API_ENDPOINT=$value" >> "$env_tmp"
                ;;
            "UserPoolId")
                echo "USER_POOL_ID=$value" >> "$env_tmp"
                ;;
            "UserPoolClientId")
                echo "USER_POOL_CLIENT_ID=$value" >> "$env_tmp"
                ;;
            "EntriesTableName")
                echo "ENTRIES_TABLE=$value" >> "$env_tmp"
                ;;
            "SettingsTableName")
                echo "SETTINGS_TABLE=$value" >> "$env_tmp"
                ;;
            "PromptsTableName")
                echo "PROMPTS_TABLE=$value" >> "$env_tmp"
                ;;
            "AnalyticsTableName")
                echo "ANALYTICS_TABLE=$value" >> "$env_tmp"
                ;;
            # Add other important outputs as needed
        esac
    done <<< "$stack_output"
    
    # Add test user for convenience
    echo "TEST_USER=test@example.com" >> "$env_tmp"
    echo "TEST_PASSWORD=Test123!" >> "$env_tmp"
    
    # Add AWS region
    echo "AWS_REGION=$REGION" >> "$env_tmp"
    
    # Move temp file to final location
    mv "$env_tmp" "$ENV_FILE"
    log_success "Environment file updated at $ENV_FILE"
}

create_test_user() {
    log_info "Creating test user..."
    
    # Get user pool ID from environment file
    local user_pool_id
    user_pool_id=$(grep "USER_POOL_ID" "$ENV_FILE" | cut -d= -f2)
    
    if [ -z "$user_pool_id" ]; then
        log_error "USER_POOL_ID not found in $ENV_FILE"
        exit 1
    fi
    
    local username="test@example.com"
    local password="Test123!"
    
    # Check if user already exists
    if aws cognito-idp admin-get-user --user-pool-id "$user_pool_id" --username "$username" > /dev/null 2>&1; then
        log_info "User $username already exists"
    else
        log_info "Creating new user $username in user pool $user_pool_id"
        aws cognito-idp admin-create-user \
            --user-pool-id "$user_pool_id" \
            --username "$username" \
            --temporary-password "$password" \
            --user-attributes Name=email,Value="$username" Name=email_verified,Value=true \
            --message-action SUPPRESS > "$LOG_DIR/cognito-user-create.log" 2>&1
        
        if [ $? -ne 0 ]; then
            log_error "Failed to create user. See $LOG_DIR/cognito-user-create.log"
            cat "$LOG_DIR/cognito-user-create.log"
            exit 1
        fi
    fi
    
    # Set permanent password
    log_info "Setting permanent password for $username"
    aws cognito-idp admin-set-user-password \
        --user-pool-id "$user_pool_id" \
        --username "$username" \
        --password "$password" \
        --permanent > "$LOG_DIR/cognito-password.log" 2>&1
    
    if [ $? -ne 0 ]; then
        log_error "Failed to set permanent password. See $LOG_DIR/cognito-password.log"
        cat "$LOG_DIR/cognito-password.log"
        exit 1
    fi
    
    log_success "Test user setup complete"
}

get_auth_token() {
    log_info "Getting authentication token..."
    
    # Source environment file to get variables
    source "$ENV_FILE"
    
    # Ensure required variables exist
    if [[ -z "${TEST_USER:-}" || -z "${TEST_PASSWORD:-}" || -z "${USER_POOL_ID:-}" || -z "${USER_POOL_CLIENT_ID:-}" ]]; then
        log_error "Missing required environment variables in $ENV_FILE"
        exit 1
    fi
    
    # Try admin-initiate-auth
    log_info "Attempting admin auth flow..."
    local admin_auth_result
    admin_auth_result=$(aws cognito-idp admin-initiate-auth \
        --user-pool-id "$USER_POOL_ID" \
        --client-id "$USER_POOL_CLIENT_ID" \
        --auth-flow ADMIN_USER_PASSWORD_AUTH \
        --auth-parameters USERNAME="$TEST_USER",PASSWORD="$TEST_PASSWORD" \
        --output json 2>"$LOG_DIR/admin_auth_error.log")
    
    local auth_exit_code=$?
    echo "$admin_auth_result" > "$LOG_DIR/admin_auth_result.json"
    
    # Extract token from auth result
    local token
    if [[ $auth_exit_code -eq 0 ]]; then
        token=$(echo "$admin_auth_result" | jq -r '.AuthenticationResult.IdToken // empty')
    else
        log_error "Authentication failed. Check $LOG_DIR/admin_auth_error.log"
        cat "$LOG_DIR/admin_auth_error.log"
        exit 1
    fi
    
    if [[ -z "$token" || "$token" == "null" ]]; then
        log_error "Failed to extract token from auth result"
        exit 1
    fi
    
    # Save token to file
    echo "$token" > "$TOKEN_FILE"
    chmod 600 "$TOKEN_FILE"
    log_success "Authentication token saved to $TOKEN_FILE"
}

test_endpoints() {
    log_info "Testing API endpoints..."
    
    # Run the test-endpoints.sh script
    if [ -f "$SCRIPTS_DIR/test-endpoints.sh" ]; then
        bash "$SCRIPTS_DIR/test-endpoints.sh" -r "$REGION" 2>&1 | tee "$LOG_DIR/test-endpoints.log"
        if [ ${PIPESTATUS[0]} -ne 0 ]; then
            log_warning "Some endpoint tests failed. Check $LOG_DIR/test-endpoints.log for details."
            # Continue despite failures
        else
            log_success "All endpoint tests passed successfully."
        fi
    else
        log_error "test-endpoints.sh script not found in $SCRIPTS_DIR"
        # Continue execution
    fi
}

verify_lambdas() {
    log_info "Verifying Lambda deployments..."
    
    # Run the verify-lambda.sh script for each service
    services=("entry-service" "analytics-service" "ai-service" "settings-service" "authorizer" "prompts-service")
    
    for service in "${services[@]}"; do
        if [ -f "$SCRIPTS_DIR/verify-lambda.sh" ]; then
            log_info "Verifying $service Lambda function..."
            bash "$SCRIPTS_DIR/verify-lambda.sh" -s "$service" -r "$REGION" 2>&1 | tee "$LOG_DIR/verify-$service.log"
            if [ ${PIPESTATUS[0]} -ne 0 ]; then
                log_warning "Verification for $service failed. Check $LOG_DIR/verify-$service.log for details."
                # Continue despite failures
            else
                log_success "$service Lambda verified successfully."
            fi
        else
            log_error "verify-lambda.sh script not found in $SCRIPTS_DIR"
            break
        fi
    done
}

setup_frontend() {
    log_info "Setting up frontend environment..."
    
    # Create a .env.local file in the frontend directory
    local frontend_env="../frontend/.env.local"
    local backend_env="$ENV_FILE"
    
    # Make sure backend env file exists
    if [ ! -f "$backend_env" ]; then
        log_error "Backend environment file $backend_env not found."
        exit 1
    fi
    
    # Source backend env file to get API_ENDPOINT and other settings
    source "$backend_env"
    
    # Create frontend env file
    cat > "$frontend_env" << EOF
# Generated by init.sh - $(date)
NEXT_PUBLIC_API_ENDPOINT=${API_ENDPOINT}
NEXT_PUBLIC_REGION=${AWS_REGION}
NEXT_PUBLIC_USER_POOL_ID=${USER_POOL_ID}
NEXT_PUBLIC_USER_POOL_CLIENT_ID=${USER_POOL_CLIENT_ID}
EOF
    
    log_success "Frontend environment file created at $frontend_env"
    
    log_info "Frontend is now configured to use the deployed backend at ${API_ENDPOINT}"
}

########################################
# Main Function
########################################
main() {
    log_info "Initializing Reflekt Journal App backend..."
    
    # Check prerequisites
    check_prerequisites
    
    # Setup AWS credentials
    setup_aws_credentials
    
    # Build all services
    build_services
    
    # Deploy the stack
    deploy_stack
    
    # Get stack outputs
    stack_output=$(get_stack_outputs)
    
    # Update environment file
    update_env_file "$stack_output"
    
    # Create test user
    create_test_user
    
    # Get authentication token
    get_auth_token
    
    # Verify Lambda deployments
    verify_lambdas
    
    # Test endpoints
    test_endpoints
    
    # Setup frontend
    setup_frontend
    
    log_success "Backend initialization complete!"
    log_info "==================================================="
    log_info "Next steps:"
    log_info "1. The backend is now deployed and ready to use."
    log_info "2. The frontend is configured to use the deployed backend."
    log_info "3. Start the frontend with 'cd ../frontend && yarn dev'"
    log_info "4. Use the test user credentials from $ENV_FILE to log in."
    log_info "==================================================="
}

# Run the main function
main "$@"