#!/bin/bash
# common.sh - Common utility functions for Reflekt Journal App scripts
# This file should be sourced by other scripts

########################################
# Script Environment Setup
########################################

# Current directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
DEFAULT_LOG_DIR="$BACKEND_DIR/logs"
DEFAULT_ENV_FILE="$BACKEND_DIR/.env"
DEFAULT_TOKEN_FILE="$BACKEND_DIR/.token"
DEFAULT_STACK_NAME="reflekt-journal"
DEFAULT_STAGE="dev"
DEFAULT_REGION="${AWS_REGION:-us-east-1}"
DEFAULT_REQUIRED_SPACE_MB=500

# Create default log directory if it doesn't exist
mkdir -p "$DEFAULT_LOG_DIR"

########################################
# Logging Functions
########################################

print_banner() {
    local text="$1"
    local width="${2:-80}"
    local padding=$(( (width - ${#text} - 2) / 2 ))
    local line=$(printf '%*s' "$width" | tr ' ' '=')
    
    echo -e "\n$line"
    printf "%*s %s %*s\n" $padding "" "$text" $padding ""
    echo -e "$line\n"
}

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

log_debug() {
    if [[ "${DEBUG:-false}" == "true" ]]; then
        echo -e "\033[0;90m[DEBUG]\033[0m $1"
    fi
}

########################################
# Space Management Functions
########################################

check_available_space() {
    local required_mb="${1:-$DEFAULT_REQUIRED_SPACE_MB}"
    
    log_info "Checking available disk space..."
    
    local available_kb=$(df . | awk 'NR==2 {print $4}')
    local available_mb=$((available_kb / 1024))
    
    log_info "Available space: ${available_mb}MB (Required: ${required_mb}MB)"
    
    if [ $available_mb -lt $required_mb ]; then
        log_error "Insufficient disk space! Need at least ${required_mb}MB, but only have ${available_mb}MB."
        log_info "Please free up some space or use an external build directory."
        log_info "Tip: You can set CARGO_TARGET_DIR to use a different location for build artifacts."
        return 1
    fi
    
    log_success "Sufficient disk space available."
    return 0
}

cleanup_build_artifacts() {
    local directory="${1:-.}"
    local log_dir="${2:-$DEFAULT_LOG_DIR}"
    
    log_info "Cleaning up build artifacts in $directory..."
    
    # Remove Rust target directories
    find "$directory" -name "target" -type d -exec rm -rf {} + 2>/dev/null || true
    
    # Remove Lambda ZIP files
    find "$directory" -name "*.zip" -type f -exec rm -f {} + 2>/dev/null || true
    
    # Remove temporary files
    find "$directory" -name "*.tmp" -type f -exec rm -f {} + 2>/dev/null || true
    
    log_success "Build artifacts cleaned up."
}

########################################
# Prerequisites Functions
########################################

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check for AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        return 1
    fi
    
    # Check for AWS SAM CLI
    if ! command -v sam &> /dev/null; then
        log_error "AWS SAM CLI is not installed. Please install it first."
        return 1
    fi
    
    # Check for jq
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed. Please install it first."
        return 1
    fi
    
    # Check for Rust/Cargo for Rust projects
    if ! command -v cargo &> /dev/null; then
        log_warning "Cargo is not installed. This is required for building Rust services."
    fi
    
    # Verify AWS credentials are configured
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log_error "AWS credentials not configured. Please run 'aws configure' or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables."
        return 1
    fi
    
    log_success "All prerequisites checked."
    return 0
}

########################################
# AWS Helper Functions
########################################

aws_check_credentials() {
    log_info "Verifying AWS credentials..."
    
    # First, check if credentials are already in environment
    if [ -n "${AWS_ACCESS_KEY_ID:-}" ] && [ -n "${AWS_SECRET_ACCESS_KEY:-}" ]; then
        log_success "Using AWS credentials from environment variables"
        return 0
    fi
    
    # Next, check if AWS CLI is configured with credentials
    if aws sts get-caller-identity &>/dev/null; then
        local aws_account_id
        aws_account_id=$(aws sts get-caller-identity --query 'Account' --output text)
        log_success "Using AWS credentials from AWS CLI configuration (Account: $aws_account_id)"
        return 0
    fi
    
    # If we're here, no credentials were found
    log_error "No AWS credentials found. Please configure AWS CLI or set environment variables."
    log_error "Run 'aws configure' or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables."
    return 1
}

aws_get_stack_outputs() {
    local stack_name="$1"
    local region="${2:-$DEFAULT_REGION}"
    local log_dir="${3:-$DEFAULT_LOG_DIR}"
    
    log_info "Fetching CloudFormation stack outputs for $stack_name..."
    
    if [ -z "$stack_name" ]; then
        log_error "Stack name is required for aws_get_stack_outputs"
        return 1
    fi
    
    local stack_output
    stack_output=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$region" \
        --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
        --output text 2>"$log_dir/stack_outputs_error.log")
    
    if [ $? -ne 0 ]; then
        log_error "Failed to fetch stack outputs. Check $log_dir/stack_outputs_error.log"
        cat "$log_dir/stack_outputs_error.log"
        return 1
    fi
    
    echo "$stack_output" > "$log_dir/stack_outputs.txt"
    log_success "Stack outputs retrieved successfully."
    echo "$stack_output"
}

aws_get_resource_id() {
    local stack_name="$1"
    local logical_id="$2"
    local region="${3:-$DEFAULT_REGION}"
    local log_dir="${4:-$DEFAULT_LOG_DIR}"
    
    log_info "Getting resource ID for $logical_id in stack $stack_name..."
    
    if [ -z "$stack_name" ] || [ -z "$logical_id" ]; then
        log_error "Stack name and logical ID are required for aws_get_resource_id"
        return 1
    fi
    
    local resource_id
    resource_id=$(aws cloudformation describe-stack-resources \
        --stack-name "$stack_name" \
        --logical-resource-id "$logical_id" \
        --query "StackResources[0].PhysicalResourceId" \
        --output text \
        --region "$region" 2>"$log_dir/resource_id_error.log")
    
    if [ $? -ne 0 ]; then
        log_error "Failed to get resource ID. Check $log_dir/resource_id_error.log"
        return 1
    fi
    
    log_success "Resource ID retrieved: $resource_id"
    echo "$resource_id"
}

aws_verify_template() {
    local template_file="$1"
    local log_dir="${2:-$DEFAULT_LOG_DIR}"
    
    log_info "Validating CloudFormation template at $template_file..."
    
    if [ ! -f "$template_file" ]; then
        log_error "CloudFormation template not found at $template_file"
        return 1
    fi
    
    aws cloudformation validate-template \
        --template-body "file://$template_file" \
        > "$log_dir/template-validation.log" 2>&1
    
    if [ $? -ne 0 ]; then
        log_error "Template validation failed. See $log_dir/template-validation.log for details."
        cat "$log_dir/template-validation.log"
        return 1
    fi
    
    log_success "CloudFormation template successfully validated."
    return 0
}

aws_check_s3_bucket() {
    local bucket_name="$1"
    local region="${2:-$DEFAULT_REGION}"
    
    log_info "Checking S3 bucket: $bucket_name..."
    
    # If bucket not specified, create a unique one based on account ID
    if [ -z "$bucket_name" ]; then
        local aws_account_id
        aws_account_id=$(aws sts get-caller-identity --query 'Account' --output text)
        bucket_name="reflekt-deploy-${aws_account_id}-${region}"
        log_info "No bucket specified, using: $bucket_name"
    fi
    
    # Check if bucket exists
    if aws s3api head-bucket --bucket "$bucket_name" --region "$region" 2>/dev/null; then
        log_success "Using existing S3 bucket: $bucket_name"
    else
        log_info "Creating S3 bucket: $bucket_name"
        aws s3 mb "s3://$bucket_name" --region "$region" 2>/dev/null
        
        if [ $? -ne 0 ]; then
            log_error "Failed to create S3 bucket. Please specify a valid bucket name."
            return 1
        fi
        
        log_success "S3 bucket created: $bucket_name"
    fi
    
    echo "$bucket_name"
}

########################################
# Authentication Helper Functions
########################################

cognito_create_test_user() {
    local user_pool_id="$1"
    local username="$2"
    local password="$3"
    local region="${4:-$DEFAULT_REGION}"
    local log_dir="${5:-$DEFAULT_LOG_DIR}"
    
    log_info "Creating test user ${username}..."
    
    if [ -z "$user_pool_id" ] || [ -z "$username" ] || [ -z "$password" ]; then
        log_error "User pool ID, username, and password are required for cognito_create_test_user"
        return 1
    fi
    
    # Check if user already exists
    if aws cognito-idp admin-get-user --user-pool-id "$user_pool_id" --username "$username" --region "$region" > /dev/null 2>&1; then
        log_info "User $username already exists"
    else
        log_info "Creating new user $username in user pool $user_pool_id"
        aws cognito-idp admin-create-user \
            --user-pool-id "$user_pool_id" \
            --username "$username" \
            --temporary-password "$password" \
            --user-attributes Name=email,Value="$username" Name=email_verified,Value=true \
            --message-action SUPPRESS \
            --region "$region" > "$log_dir/cognito-user-create.log" 2>&1
        
        if [ $? -ne 0 ]; then
            log_error "Failed to create user. See $log_dir/cognito-user-create.log"
            cat "$log_dir/cognito-user-create.log"
            return 1
        fi
    fi
    
    # Set permanent password
    log_info "Setting permanent password for $username"
    aws cognito-idp admin-set-user-password \
        --user-pool-id "$user_pool_id" \
        --username "$username" \
        --password "$password" \
        --permanent \
        --region "$region" > "$log_dir/cognito-password.log" 2>&1
    
    if [ $? -ne 0 ]; then
        log_error "Failed to set permanent password. See $log_dir/cognito-password.log"
        cat "$log_dir/cognito-password.log"
        return 1
    fi
    
    log_success "Test user setup complete"
    return 0
}

cognito_get_auth_token() {
    local user_pool_id="$1"
    local client_id="$2"
    local username="$3"
    local password="$4"
    local token_file="${5:-$DEFAULT_TOKEN_FILE}"
    local region="${6:-$DEFAULT_REGION}"
    local log_dir="${7:-$DEFAULT_LOG_DIR}"
    
    log_info "Getting authentication token for $username..."
    
    if [ -z "$user_pool_id" ] || [ -z "$client_id" ] || [ -z "$username" ] || [ -z "$password" ]; then
        log_error "User pool ID, client ID, username, and password are required for cognito_get_auth_token"
        return 1
    fi
    
    # Try admin-initiate-auth
    log_info "Attempting admin auth flow..."
    local admin_auth_result
    admin_auth_result=$(aws cognito-idp admin-initiate-auth \
        --user-pool-id "$user_pool_id" \
        --client-id "$client_id" \
        --auth-flow ADMIN_USER_PASSWORD_AUTH \
        --auth-parameters USERNAME="$username",PASSWORD="$password" \
        --region "$region" \
        --output json 2>"$log_dir/admin_auth_error.log")
    
    local auth_exit_code=$?
    echo "$admin_auth_result" > "$log_dir/admin_auth_result.json"
    
    # Extract token from auth result
    local token
    if [[ $auth_exit_code -eq 0 ]]; then
        token=$(echo "$admin_auth_result" | jq -r '.AuthenticationResult.IdToken // empty')
    else
        log_error "Authentication failed. Check $log_dir/admin_auth_error.log"
        cat "$log_dir/admin_auth_error.log"
        return 1
    fi
    
    if [[ -z "$token" || "$token" == "null" ]]; then
        log_error "Failed to extract token from auth result"
        return 1
    fi
    
    # Save token to file
    echo "$token" > "$token_file"
    chmod 600 "$token_file"
    log_success "Authentication token saved to $token_file"
    
    return 0
}

########################################
# HTTP Request Helper Functions
########################################

http_request() {
    local url="$1"
    local method="${2:-GET}"
    local headers="$3"
    local data="$4"
    local expected_status="${5:-200}"
    local log_dir="${6:-$DEFAULT_LOG_DIR}"
    local log_file="$log_dir/http_request_$(date +%s).log"
    
    log_info "Making HTTP request to $url"
    
    # Build curl command
    local curl_cmd="curl -s -w '\n%{http_code}' -X $method"
    
    # Add headers if provided
    if [ -n "$headers" ]; then
        local IFS=';'
        read -ra header_array <<< "$headers"
        for header in "${header_array[@]}"; do
            curl_cmd="$curl_cmd -H '$header'"
        done
    fi
    
    # Add data if provided
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    # Add URL
    curl_cmd="$curl_cmd '$url'"
    
    # Execute the request
    log_debug "Executing: $curl_cmd"
    local response
    response=$(eval "$curl_cmd")
    local status_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    # Save request details for debugging
    {
        echo "REQUEST:"
        echo "URL: $url"
        echo "Method: $method"
        echo "Headers: $headers"
        [ -n "$data" ] && echo "Payload: $data"
        echo -e "\nRESPONSE:"
        echo "Status: $status_code"
        echo "Body: $body"
    } > "$log_file"
    
    # Check if status code matches expected
    if [ "$status_code" -eq "$expected_status" ]; then
        log_success "Request succeeded with status $status_code (expected $expected_status)"
        # Return both status code and body
        echo "$body"
        return 0
    else
        log_error "Request failed with status $status_code (expected $expected_status)"
        log_error "See $log_file for details"
        return 1
    fi
}

########################################
# Lambda Helper Functions
########################################

get_lambda_name() {
    local service="$1"
    local stack_name="${2:-$DEFAULT_STACK_NAME}"
    local stage="${3:-$DEFAULT_STAGE}"
    local region="${4:-$DEFAULT_REGION}"
    local full_stack_name="$stack_name-$stage"
    
    log_info "Getting Lambda function name for service: $service"
    
    # Convert service name to logical resource ID format
    # Example: entry-service -> EntryServiceFunction
    local resource_name
    case "$service" in
        entry-service)
            resource_name="EntryServiceFunction"
            ;;
        analytics-service)
            resource_name="AnalyticsServiceFunction"
            ;;
        ai-service)
            resource_name="AiServiceFunction"
            ;;
        settings-service)
            resource_name="SettingsServiceFunction"
            ;;
        authorizer)
            resource_name="AuthorizerFunction"
            ;;
        prompts-service)
            resource_name="PromptsServiceFunction"
            ;;
        *)
            resource_name=$(echo "$service" | sed -r 's/(^|-)([a-z])/\U\2/g')Function
            ;;
    esac
    
    # Get physical resource ID (Lambda function name) from CloudFormation stack
    local function_name
    function_name=$(aws cloudformation describe-stack-resources \
        --stack-name "$full_stack_name" \
        --logical-resource-id "$resource_name" \
        --query "StackResources[0].PhysicalResourceId" \
        --output text \
        --region "$region" 2>/dev/null)
    
    if [ $? -ne 0 ] || [ -z "$function_name" ] || [ "$function_name" == "None" ]; then
        log_warning "Could not find Lambda function for $resource_name, trying alternative method..."
        
        # Try listing all resources and grep for the service name
        local alt_function_name
        alt_function_name=$(aws cloudformation list-stack-resources \
            --stack-name "$full_stack_name" \
            --query "StackResourceSummaries[?ResourceType=='AWS::Lambda::Function'].PhysicalResourceId" \
            --output text \
            --region "$region" | grep -i "${service//-/}" | head -1)
        
        if [ -n "$alt_function_name" ]; then
            function_name="$alt_function_name"
            log_info "Found function using alternative method: $function_name"
        else
            log_error "Could not find Lambda function for $service"
            return 1
        fi
    fi
    
    log_success "Found Lambda function: $function_name"
    echo "$function_name"
}

invoke_lambda() {
    local function_name="$1"
    local payload="$2"
    local region="${3:-$DEFAULT_REGION}"
    local log_dir="${4:-$DEFAULT_LOG_DIR}"
    
    log_info "Invoking Lambda function: $function_name"
    
    # Create a simple test payload if none provided
    if [ -z "$payload" ]; then
        payload='{
            "source": "invoke_lambda",
            "action": "test",
            "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
        }'
    fi
    
    log_debug "Payload: $payload"
    
    # Encode payload for Lambda if needed
    local encoded_payload="$payload"
    if ! echo "$payload" | jq empty &>/dev/null; then
        encoded_payload=$(echo "$payload" | base64 | tr -d '\n')
    fi
    
    # Invoke Lambda function
    local response_file="$log_dir/lambda-invoke-response-$(basename "$function_name").json"
    local log_file="$log_dir/lambda-invoke-$(basename "$function_name").log"
    
    aws lambda invoke \
        --function-name "$function_name" \
        --payload "$encoded_payload" \
        --cli-binary-format raw-in-base64-out \
        --region "$region" \
        --log-type Tail \
        "$response_file" > "$log_file" 2>&1
    
    if [ $? -ne 0 ]; then
        log_error "Lambda invocation failed. See $log_file"
        cat "$log_file"
        return 1
    fi
    
    # Get status code
    local status_code=$(jq -r '.StatusCode' "$log_file" 2>/dev/null)
    
    if [ "$status_code" -eq 200 ]; then
        log_success "Lambda invocation succeeded with status code $status_code"
    else
        log_error "Lambda invocation returned unexpected status code: $status_code"
        cat "$log_file"
        return 1
    fi
    
    # Decode and display execution logs
    if grep -q "LogResult" "$log_file"; then
        local log_result=$(grep -o '"LogResult": "[^"]*"' "$log_file" | cut -d'"' -f4)
        
        if [ -n "$log_result" ]; then
            echo "$log_result" | base64 --decode > "$log_dir/lambda-execution-$(basename "$function_name").log"
        fi
    fi
    
    # Return function response
    cat "$response_file"
    return 0
}

########################################
# Environment File Management
########################################

update_env_file() {
    local stack_output="$1"
    local env_file="${2:-$DEFAULT_ENV_FILE}"
    local env_tmp="${env_file}.tmp"
    
    log_info "Updating environment file: $env_file"
    
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
    echo "AWS_REGION=${DEFAULT_REGION}" >> "$env_tmp"
    
    # Move temp file to final location
    mv "$env_tmp" "$env_file"
    chmod 600 "$env_file"
    log_success "Environment file updated at $env_file"
}

load_env_file() {
    local env_file="${1:-$DEFAULT_ENV_FILE}"
    
    log_info "Loading environment file: $env_file"
    
    if [ ! -f "$env_file" ]; then
        log_error "Environment file not found: $env_file"
        return 1
    fi
    
    # Source the environment file
    source "$env_file"
    
    # Check for required variables
    if [ -z "${API_ENDPOINT:-}" ]; then
        log_warning "API_ENDPOINT not found in $env_file"
    else
        log_info "API Endpoint: $API_ENDPOINT"
    fi
    
    log_success "Environment file loaded"
    return 0
}

########################################
# Frontend Integration
########################################

setup_frontend_env() {
    local backend_env="${1:-$DEFAULT_ENV_FILE}"
    local frontend_env="${2:-../frontend/.env.local}"
    
    log_info "Setting up frontend environment: $frontend_env"
    
    # Make sure backend env file exists
    if [ ! -f "$backend_env" ]; then
        log_error "Backend environment file $backend_env not found."
        return 1
    fi
    
    # Source backend env file to get variables
    source "$backend_env"
    
    # Check for required variables
    if [ -z "${API_ENDPOINT:-}" ] || [ -z "${USER_POOL_ID:-}" ] || [ -z "${USER_POOL_CLIENT_ID:-}" ]; then
        log_error "Missing required environment variables in $backend_env"
        return 1
    fi
    
    # Create frontend env file
    cat > "$frontend_env" << EOF
# Generated by Reflekt Journal App scripts - $(date)
NEXT_PUBLIC_API_ENDPOINT=${API_ENDPOINT}
NEXT_PUBLIC_REGION=${AWS_REGION:-$DEFAULT_REGION}
NEXT_PUBLIC_USER_POOL_ID=${USER_POOL_ID}
NEXT_PUBLIC_USER_POOL_CLIENT_ID=${USER_POOL_CLIENT_ID}
EOF
    
    log_success "Frontend environment file created at $frontend_env"
    log_info "Frontend is now configured to use the deployed backend at ${API_ENDPOINT}"
    
    return 0
}

########################################
# Command Line Argument Parsing
########################################

parse_common_args() {
    # First, set default values
    STACK_NAME="$DEFAULT_STACK_NAME"
    STAGE="$DEFAULT_STAGE"
    REGION="$DEFAULT_REGION"
    LOG_DIR="$DEFAULT_LOG_DIR"
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -n|--name|--stack-name)
                STACK_NAME="$2"
                shift 2
                ;;
            -s|--stage)
                STAGE="$2"
                shift 2
                ;;
            -r|--region)
                REGION="$2"
                shift 2
                ;;
            -l|--log-dir)
                LOG_DIR="$2"
                shift 2
                ;;
            *)
                # Return remaining arguments
                echo "$@"
                return
                ;;
        esac
    done
    
    # Use stage in stack name if not already included
    if [[ ! "$STACK_NAME" == *-"$STAGE" ]]; then
        STACK_NAME="${STACK_NAME}-${STAGE}"
    fi
    
    # Export variables for use in the calling script
    export STACK_NAME
    export STAGE
    export REGION
    export LOG_DIR
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    log_info "Stack Name: $STACK_NAME"
    log_info "Stage: $STAGE"
    log_info "Region: $REGION"
    log_info "Log Directory: $LOG_DIR"
    
    return 0
}

########################################
# Utility Functions
########################################

generate_random_string() {
    local length="${1:-32}"
    openssl rand -base64 "$length" | tr -dc 'a-zA-Z0-9' | head -c "$length"
}

get_timestamp() {
    date +"%Y-%m-%d %H:%M:%S"
}

is_command_available() {
    local cmd="$1"
    if command -v "$cmd" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

wait_for_url() {
    local url="$1"
    local max_attempts="${2:-10}"
    local wait_seconds="${3:-5}"
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log_info "Attempt $attempt/$max_attempts: Checking $url..."
        
        if curl -s -f -o /dev/null "$url"; then
            log_success "URL $url is accessible!"
            return 0
        fi
        
        log_warning "URL not accessible yet, waiting ${wait_seconds}s..."
        sleep $wait_seconds
        attempt=$((attempt + 1))
    done
    
    log_error "URL $url could not be accessed after $max_attempts attempts"
    return 1
}

generate_jwt_secret() {
    local length="${1:-32}"
    log_info "Generating JWT secret..."
    local secret=$(openssl rand -base64 "$length")
    log_success "JWT secret generated"
    echo "$secret"
}

verify_file_exists() {
    local file="$1"
    local description="${2:-file}"
    
    if [ ! -f "$file" ]; then
        log_error "$description not found at $file"
        return 1
    fi
    
    log_debug "$description exists at $file"
    return 0
}

verify_directory_exists() {
    local directory="$1"
    local description="${2:-directory}"
    
    if [ ! -d "$directory" ]; then
        log_error "$description not found at $directory"
        return 1
    fi
    
    log_debug "$description exists at $directory"
    return 0
}

# If this script is executed directly, show usage
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    print_banner "REFLEKT JOURNAL APP COMMON UTILITIES"
    log_info "This script provides common utilities and should be sourced by other scripts."
    log_info "Usage: source $(basename "${BASH_SOURCE[0]}")"
fi 