#!/bin/bash
set -eo pipefail

# Source common helper functions
SCRIPT_DIR="$(dirname "$0")"
source "$SCRIPT_DIR/common.sh"

# Script constants
LOG_DIR="$BACKEND_DIR/lambda-logs"
SERVICE_NAME=""

# Create logs directory
mkdir -p "$LOG_DIR"

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -s|--service)
                SERVICE_NAME="$2"
                shift 2
                ;;
            -r|--region)
                REGION="$2"
                shift 2
                ;;
            -h|--help)
                show_usage
                ;;
            *)
                shift
                ;;
        esac
    done
    
    if [ -z "$SERVICE_NAME" ]; then
        log_error "Service name is required. Use -s or --service to specify."
        show_usage
    fi
}

show_usage() {
    echo "Usage: $(basename "$0") [options]"
    echo "Options:"
    echo "  -s, --service    Service name to verify (entry-service, analytics-service, etc.)"
    echo "  -r, --region     AWS Region (default: us-east-1)"
    echo "  -h, --help       Show this help message"
    exit 0
}

# Verify Lambda function
verify_lambda() {
    local function_name="$1"
    
    print_banner "VERIFYING LAMBDA FUNCTION: $function_name"
    
    # Get function configuration
    log_info "Getting Lambda configuration..."
    local config
    config=$(aws lambda get-function-configuration \
        --function-name "$function_name" \
        --region "$REGION" \
        --output json 2>"$LOG_DIR/lambda-config-error.log")
    
    if [ $? -ne 0 ]; then
        log_error "Failed to get Lambda configuration. See $LOG_DIR/lambda-config-error.log"
        exit 1
    fi
    
    # Save configuration for inspection
    echo "$config" > "$LOG_DIR/lambda-config-$function_name.json"
    
    # Test invoke the function
    log_info "Invoking Lambda function with test payload..."
    local payload='{
        "source": "verify-lambda.sh",
        "action": "test",
        "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
    }'
    
    invoke_lambda "$function_name" "$payload" "$REGION" "$LOG_DIR"
    
    log_success "Lambda function $function_name verified successfully."
}

# Main function
main() {
    # Set default region
    REGION=${REGION:-us-east-1}
    
    # Parse command line arguments
    parse_args "$@"
    
    print_banner "LAMBDA VERIFICATION: $SERVICE_NAME"
    
    # Get Lambda function name from service name
    local function_name
    function_name=$(get_lambda_name "$SERVICE_NAME" "$STACK_NAME" "$STAGE" "$REGION")
    
    if [ -z "$function_name" ]; then
        log_error "Could not determine Lambda function name for $SERVICE_NAME"
        exit 1
    fi
    
    log_info "Found Lambda function: $function_name"
    
    # Verify the Lambda function
    verify_lambda "$function_name"
    
    log_success "Verification complete"
}

main "$@" 