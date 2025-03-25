#!/bin/bash
set -eo pipefail

# Source common helper functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Script-specific constants
LOG_DIR="$BACKEND_DIR/init-logs"
ENVIRONMENT=${ENVIRONMENT:-dev}
STACK_NAME=${STACK_NAME:-reflekt-journal-${ENVIRONMENT}}
REGION=${AWS_REGION:-us-east-1}
ENV_FILE="$BACKEND_DIR/.env"
TOKEN_FILE="$BACKEND_DIR/.token"

# Create log directory and clean up any existing logs
mkdir -p "$LOG_DIR"
rm -rf "$LOG_DIR"/*

########################################
# Script-specific Functions
########################################

create_test_user() {
    local username="test@example.com"
    local temp_password="Test123!"
    local user_pool_id="$1"
    
    if [ -z "$user_pool_id" ]; then
        # Try to get user pool ID from environment file
        if [ -f "$ENV_FILE" ] && grep -q "USER_POOL_ID" "$ENV_FILE"; then
            user_pool_id=$(grep "USER_POOL_ID" "$ENV_FILE" | cut -d= -f2)
        fi
        
        if [ -z "$user_pool_id" ]; then
            log_error "User pool ID not provided and not found in $ENV_FILE"
            return 1
        fi
    fi
    
    mkdir -p "$LOG_DIR"
    
    log_info "Creating test user ${username}..."
    
    # Check if user already exists
    if aws cognito-idp admin-get-user --user-pool-id "$user_pool_id" --username "$username" > /dev/null 2>&1; then
        log_info "User $username already exists"
    else
        log_info "Creating new user $username in user pool $user_pool_id"
        aws cognito-idp admin-create-user \
            --user-pool-id "$user_pool_id" \
            --username "$username" \
            --temporary-password "$temp_password" \
            --user-attributes Name=email,Value="$username" Name=email_verified,Value=true \
            --message-action SUPPRESS > "$LOG_DIR/cognito-user-create.log" 2>&1
        
        if [ $? -ne 0 ]; then
            log_error "Failed to create user. See $LOG_DIR/cognito-user-create.log"
            cat "$LOG_DIR/cognito-user-create.log"
            return 1
        fi
    fi
    
    # Set permanent password
    log_info "Setting permanent password for $username"
    aws cognito-idp admin-set-user-password \
        --user-pool-id "$user_pool_id" \
        --username "$username" \
        --password "$temp_password" \
        --permanent > "$LOG_DIR/cognito-password.log" 2>&1
    
    if [ $? -ne 0 ]; then
        log_error "Failed to set permanent password. See $LOG_DIR/cognito-password.log"
        cat "$LOG_DIR/cognito-password.log"
        return 1
    fi
    
    log_success "Test user setup complete"
}

get_auth_token() {
    log_info "Getting authentication token..."
    local token_file="${TOKEN_FILE:-".token"}"
    
    # Source environment file to get Cognito details
    if [ -f "$ENV_FILE" ]; then
        source "$ENV_FILE"
    fi
    
    # Ensure we're using the correct credentials from env file
    if [[ -z "${TEST_USER:-}" || -z "${TEST_PASSWORD:-}" ]]; then
        log_error "TEST_USER or TEST_PASSWORD not defined in environment"
        return 1
    fi
    
    if [[ -z "${USER_POOL_ID:-}" || -z "${USER_POOL_CLIENT_ID:-}" ]]; then
        log_error "USER_POOL_ID or USER_POOL_CLIENT_ID not defined in environment"
        return 1
    fi
    
    # Try admin-initiate-auth with enhanced debugging
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
    
    local token
    if [[ $auth_exit_code -ne 0 || "$admin_auth_result" == *"NotAuthorizedException"* ]]; then
        log_warning "Admin auth failed, trying user password auth flow..."
        log_info "Admin auth error details saved to $LOG_DIR/admin_auth_error.log"
        
        # Try initiate-auth with USER_PASSWORD_AUTH
        local user_auth_result
        user_auth_result=$(aws cognito-idp initiate-auth \
            --client-id "$USER_POOL_CLIENT_ID" \
            --auth-flow USER_PASSWORD_AUTH \
            --auth-parameters USERNAME="$TEST_USER",PASSWORD="$TEST_PASSWORD" \
            --output json 2>"$LOG_DIR/user_auth_error.log")
        
        local user_auth_exit_code=$?
        echo "$user_auth_result" > "$LOG_DIR/user_auth_result.json"
        
        if [[ $user_auth_exit_code -ne 0 || "$user_auth_result" == *"NotAuthorizedException"* ]]; then
            log_error "Both auth flows failed. Make sure user exists and password is correct."
            return 1
        else
            token=$(echo "$user_auth_result" | jq -r '.AuthenticationResult.IdToken // empty')
        fi
    else
        token=$(echo "$admin_auth_result" | jq -r '.AuthenticationResult.IdToken // empty')
    fi
    
    if [[ -z "$token" || "$token" == "null" ]]; then
        log_error "Failed to extract token from auth result"
        return 1
    fi
    
    if [[ -n "$token" ]]; then
        echo "$token" > "$token_file"
        log_success "Authentication token saved to $token_file"
        chmod 600 "$token_file"
    else
        log_error "Empty authentication token received"
        return 1
    fi
}

update_env_file() {
    local stack_output="$1"
    local env_tmp="${ENV_FILE}.tmp"
    
    log_info "Updating environment file..."
    
    # Preserve existing credentials and values
    local google_client_id_old google_client_secret_old openai_api_key_old anthropic_api_key_old
    if [ -f "$ENV_FILE" ]; then
        google_client_id_old=$(grep '^GOOGLE_CLIENT_ID=' "$ENV_FILE" || true)
        google_client_secret_old=$(grep '^GOOGLE_CLIENT_SECRET=' "$ENV_FILE" || true)
        openai_api_key_old=$(grep '^OPENAI_API_KEY=' "$ENV_FILE" || true)
        anthropic_api_key_old=$(grep '^ANTHROPIC_API_KEY=' "$ENV_FILE" || true)
    fi
    
    # Try to find Lambda function names if not already set
    local entry_service_function=""
    local ai_service_function=""
    
    # Find function resources from CloudFormation
    entry_service_function=$(aws cloudformation describe-stack-resources \
        --stack-name "$STACK_NAME" \
        --query "StackResources[?ResourceType=='AWS::Lambda::Function' && contains(LogicalResourceId, 'EntryServiceFunction')].PhysicalResourceId" \
        --output text 2>/dev/null || echo "")
        
    ai_service_function=$(aws cloudformation describe-stack-resources \
        --stack-name "$STACK_NAME" \
        --query "StackResources[?ResourceType=='AWS::Lambda::Function' && contains(LogicalResourceId, 'AIServiceFunction')].PhysicalResourceId" \
        --output text 2>/dev/null || echo "")
    
    : > "$env_tmp"
    while IFS=$'\t' read -r key value; do
        # Strip ANSI codes from value
        value=$(echo "$value" | sed 's/\x1b\[[0-9;]*m//g')
        case "$key" in
            "ApiEndpoint")
                # Ensure the API endpoint doesn't have a trailing slash
                value=$(echo "$value" | sed 's:/*$::')
                echo "API_ENDPOINT=$value" >> "$env_tmp"
                ;;
            "UserPoolId")
                echo "USER_POOL_ID=$value" >> "$env_tmp"
                ;;
            "UserPoolClientId")
                echo "USER_POOL_CLIENT_ID=$value" >> "$env_tmp"
                echo "COGNITO_CLIENT_ID=$value" >> "$env_tmp"
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
        esac
    done <<< "$stack_output"
    
    # Add test user credentials
    {
        echo "TEST_USER=test@example.com"
        echo "TEST_PASSWORD=Test123!"
        echo "COGNITO_USER=test@example.com"
        echo "COGNITO_PASS=Test123!"
    } >> "$env_tmp"
    
    # Add Lambda function names if found
    if [ -n "$entry_service_function" ]; then
        echo "ENTRY_SERVICE_FUNCTION_NAME=$entry_service_function" >> "$env_tmp"
    fi
    
    if [ -n "$ai_service_function" ]; then
        echo "AI_SERVICE_FUNCTION_NAME=$ai_service_function" >> "$env_tmp"
    fi
    
    # Add AWS region
    echo "AWS_REGION=$REGION" >> "$env_tmp"
    
    # Preserve existing credentials if they exist
    [ -n "$google_client_id_old" ] && echo "$google_client_id_old" >> "$env_tmp"
    [ -n "$google_client_secret_old" ] && echo "$google_client_secret_old" >> "$env_tmp"
    [ -n "$openai_api_key_old" ] && echo "$openai_api_key_old" >> "$env_tmp"
    [ -n "$anthropic_api_key_old" ] && echo "$anthropic_api_key_old" >> "$env_tmp"
    
    mv "$env_tmp" "$ENV_FILE"
    log_success "Environment file updated."
}

build_services_sequentially() {
    print_banner "BUILDING SERVICES SEQUENTIALLY"
    
    # List of services
    local services=("entry-service" "analytics-service" "ai-service" "settings-service" "authorizer" "prompts-service")
    
    # Build common library first if it exists
    if [ -d "$BACKEND_DIR/common" ]; then
        log_info "Building common library..."
        (cd "$BACKEND_DIR/common" && cargo build --release) > "$LOG_DIR/build-common.log" 2>&1
        
        if [ $? -ne 0 ]; then
            log_error "Failed to build common library. See $LOG_DIR/build-common.log for details."
            exit 1
        fi
        
        log_success "Common library built successfully."
    fi
    
    # Loop through each service and build sequentially
    for service in "${services[@]}"; do
        log_info "Building $service..."
        
        # Create service build directory if it doesn't exist
        mkdir -p "$LOG_DIR/$service"
        
        # Build the service
        (
            cd "$BACKEND_DIR/$service" && 
            cargo build --release
        ) > "$LOG_DIR/$service/build.log" 2>&1
        
        if [ $? -ne 0 ]; then
            log_error "Failed to build $service. See $LOG_DIR/$service/build.log for details."
            exit 1
        fi
        
        log_success "$service built successfully."
        
        # Check space after each build
        check_available_space
        
        # Clean up after successful build to save space
        if [ -d "$BACKEND_DIR/$service/target" ]; then
            log_info "Cleaning up $service build artifacts to save space..."
            rm -rf "$BACKEND_DIR/$service/target"
        fi
    done
    
    log_success "All services built successfully."
}

setup_frontend_integration() {
    local frontend_env="../frontend/.env.local"
    
    log_info "Setting up frontend environment..."
    
    # Source backend env file to get variables
    source "$ENV_FILE"
    
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

# Function to deploy stack using deploy-stack.sh
deploy_stack() {
    print_banner "DEPLOYING CLOUDFORMATION STACK"
    
    if [ -f "$SCRIPT_DIR/deploy-stack.sh" ]; then
        bash "$SCRIPT_DIR/deploy-stack.sh" -s "$ENVIRONMENT" -r "$REGION" -n "$STACK_NAME" 2>&1 | tee "$LOG_DIR/deploy-stack.log"
        if [ ${PIPESTATUS[0]} -ne 0 ]; then
            log_error "Stack deployment failed. Check $LOG_DIR/deploy-stack.log for details."
            exit 1
        fi
    else
        log_error "deploy-stack.sh script not found in $SCRIPT_DIR"
        exit 1
    fi
    
    log_success "Stack deployed successfully."
}

verify_lambdas() {
    print_banner "VERIFYING LAMBDA DEPLOYMENTS"
    
    # Run the verify-lambda.sh script for each service
    services=("entry-service" "analytics-service" "ai-service" "settings-service" "authorizer" "prompts-service")
    
    for service in "${services[@]}"; do
        if [ -f "$SCRIPT_DIR/verify-lambda.sh" ]; then
            log_info "Verifying $service Lambda function..."
            bash "$SCRIPT_DIR/verify-lambda.sh" -s "$service" -r "$REGION" 2>&1 | tee "$LOG_DIR/verify-$service.log"
            if [ ${PIPESTATUS[0]} -ne 0 ]; then
                log_warning "Verification for $service failed. Check $LOG_DIR/verify-$service.log for details."
                # Continue despite failures
            else
                log_success "$service Lambda verified successfully."
            fi
        else
            log_error "verify-lambda.sh script not found in $SCRIPT_DIR"
            break
        fi
    done
}

test_endpoints() {
    print_banner "TESTING API ENDPOINTS"
    
    # Run the test-endpoints.sh script
    if [ -f "$SCRIPT_DIR/test-endpoints.sh" ]; then
        bash "$SCRIPT_DIR/test-endpoints.sh" -r "$REGION" 2>&1 | tee "$LOG_DIR/test-endpoints.log"
        if [ ${PIPESTATUS[0]} -ne 0 ]; then
            log_warning "Some endpoint tests failed. Check $LOG_DIR/test-endpoints.log for details."
            # Continue despite failures
        else
            log_success "All endpoint tests passed successfully."
        fi
    else
        log_error "test-endpoints.sh script not found in $SCRIPT_DIR"
        # Continue execution
    fi
}

########################################
# Main function
########################################
main() {
    print_banner "REFLEKT JOURNAL APP INITIALIZATION"
    
    # Check available space
    check_available_space
    
    # Initial cleanup to start fresh
    cleanup_build_artifacts "$BACKEND_DIR"
    
    # Check prerequisites
    check_prerequisites
    
    # Setup AWS credentials
    aws_check_credentials
    
    # Verify CloudFormation template
    aws_verify_template "$BACKEND_DIR/infrastructure/template.yaml" "$LOG_DIR"
    
    # Build all services (space-optimized sequential builds)
    build_services_sequentially
    
    # Deploy the stack
    deploy_stack
    
    # Get stack outputs
    stack_output=$(aws_get_stack_outputs "$STACK_NAME" "$REGION" "$LOG_DIR")
    
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
    setup_frontend_integration
    
    # Final cleanup
    cleanup_build_artifacts "$BACKEND_DIR"
    
    print_banner "INITIALIZATION COMPLETE"
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