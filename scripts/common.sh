#!/bin/bash
# common.sh - Common utilities for Reflekt Journal App scripts

########################################
# Script Environment Setup
########################################

# Detect script directory for reliable sourcing
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

# Default configuration (can be overridden by individual scripts)
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
    
    log_info "Cleaning up build artifacts in $directory..."
    
    # Remove Rust target directories
    find "$directory" -name "target" -type d -exec rm -rf {} + 2>/dev/null || true
    
    # Remove Lambda ZIP files
    find "$directory" -name "*.zip" -type f -exec rm -f {} + 2>/dev/null || true
    
    # Remove temporary files
    find "$directory" -name "*.tmp" -type f -exec rm -f {} + 2>/dev/null || true
    
    log_info "Build artifacts cleaned up."
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

########################################
# Environment Helper Functions
########################################

load_env_file() {
    local env_file="${1:-$DEFAULT_ENV_FILE}"
    
    log_info "Loading environment file: $env_file"
    
    if [ ! -f "$env_file" ]; then
        log_error "Environment file not found: $env_file"
        return 1
    fi
    
    # Source the environment file
    source "$env_file"
    
    log_success "Environment file loaded"
    return 0
}

########################################
# Utility Functions
########################################

generate_random_string() {
    local length="${1:-32}"
    openssl rand -base64 "$length" | tr -dc 'a-zA-Z0-9' | head -c "$length"
}

parse_common_args() {
    # Define return variable (initially empty)
    local parsed_args=()
    
    # Parse common arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -n|--name|--stack-name)
                export STACK_NAME="$2"
                shift 2
                ;;
            -s|--stage)
                export STAGE="$2"
                shift 2
                ;;
            -r|--region)
                export REGION="$2"
                shift 2
                ;;
            -l|--log-dir)
                export LOG_DIR="$2"
                shift 2
                ;;
            *)
                # Add to return arguments
                parsed_args+=("$1")
                shift
                ;;
        esac
    done
    
    # Use stage in stack name if provided and not already included
    if [[ -n "${STAGE:-}" && ! "${STACK_NAME:-}" == *-"$STAGE" ]]; then
        export STACK_NAME="${STACK_NAME:-$DEFAULT_STACK_NAME}-${STAGE}"
    else
        export STACK_NAME="${STACK_NAME:-$DEFAULT_STACK_NAME}"
    fi
    
    # Set defaults for other variables if not set
    export REGION="${REGION:-$DEFAULT_REGION}"
    export LOG_DIR="${LOG_DIR:-$DEFAULT_LOG_DIR}"
    
    # Return the non-common arguments
    echo "${parsed_args[@]}"
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

verify_file_exists() {
    local file="$1"
    local description="${2:-file}"
    
    if [ ! -f "$file" ]; then
        log_error "$description not found at $file"
        return 1
    fi
    
    return 0
}

is_command_available() {
    command -v "$1" &> /dev/null
}

# End of common utilities 