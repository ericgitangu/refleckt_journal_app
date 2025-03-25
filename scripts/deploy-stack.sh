#!/bin/bash
set -eo pipefail

# Source common helper functions
SCRIPT_DIR="$(dirname "$0")"
source "$SCRIPT_DIR/common.sh"

# Script constants
LOG_DIR="$BACKEND_DIR/deploy-logs"
TEMPLATE_FILE="$BACKEND_DIR/infrastructure/template.yaml"
S3_BUCKET=""
JWT_SECRET=""

# Create logs directory
mkdir -p "$LOG_DIR"

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -n|--name)
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
            -b|--bucket)
                S3_BUCKET="$2"
                shift 2
                ;;
            -j|--jwt)
                JWT_SECRET="$2"
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
    
    # Use stage in stack name if not already included
    if [[ -n "$STAGE" && ! "$STACK_NAME" == *-"$STAGE" ]]; then
        STACK_NAME="${STACK_NAME}-${STAGE}"
    fi
}

show_usage() {
    echo "Usage: $(basename "$0") [options]"
    echo "Options:"
    echo "  -n, --name       Stack name (default: reflekt-journal)"
    echo "  -s, --stage      Stage (dev, staging, prod) (default: dev)"
    echo "  -r, --region     AWS Region (default: us-east-1)"
    echo "  -b, --bucket     S3 bucket for deployment artifacts"
    echo "  -j, --jwt        JWT secret for authentication"
    echo "  -h, --help       Show this help message"
    exit 0
}

# Deploy CloudFormation stack
deploy_stack() {
    print_banner "DEPLOYING CLOUDFORMATION STACK"
    
    local stack_exists
    if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" > /dev/null 2>&1; then
        stack_exists=true
        log_info "Updating existing stack: $STACK_NAME"
    else
        stack_exists=false
        log_info "Creating new stack: $STACK_NAME"
    fi
    
    # Build command parameters
    local params="ParameterKey=Stage,ParameterValue=${STAGE}"
    
    if [ -n "$JWT_SECRET" ]; then
        params="$params ParameterKey=JwtSecret,ParameterValue=$JWT_SECRET"
    else
        JWT_SECRET=$(generate_random_string 32)
        params="$params ParameterKey=JwtSecret,ParameterValue=$JWT_SECRET"
    fi
    
    # Determine if we're creating or updating the stack
    local cmd
    if $stack_exists; then
        cmd="aws cloudformation update-stack"
    else
        cmd="aws cloudformation create-stack"
    fi
    
    # Execute CloudFormation command
    $cmd \
        --stack-name "$STACK_NAME" \
        --template-body "file://$TEMPLATE_FILE" \
        --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
        --parameters $params \
        --region "$REGION" \
        > "$LOG_DIR/stack-deploy.log" 2>&1
    
    if [ $? -ne 0 ]; then
        # Check if no updates to be performed
        if grep -q "No updates are to be performed" "$LOG_DIR/stack-deploy.log"; then
            log_info "No updates needed for stack: $STACK_NAME"
        else
            log_error "Failed to deploy stack. See $LOG_DIR/stack-deploy.log for details."
            cat "$LOG_DIR/stack-deploy.log"
            exit 1
        fi
    else
        # Wait for stack operation to complete
        log_info "Stack deployment initiated. Waiting for completion..."
        
        local wait_cmd
        if $stack_exists; then
            wait_cmd="aws cloudformation wait stack-update-complete"
        else
            wait_cmd="aws cloudformation wait stack-create-complete"
        fi
        
        $wait_cmd --stack-name "$STACK_NAME" --region "$REGION"
        
        if [ $? -ne 0 ]; then
            log_error "Stack deployment failed or timed out."
            exit 1
        fi
        
        log_success "Stack deployment completed successfully."
    fi
}

# Main function
main() {
    # Set defaults
    STACK_NAME=${STACK_NAME:-reflekt-journal}
    STAGE=${STAGE:-dev}
    REGION=${REGION:-us-east-1}
    
    # Parse command line arguments
    parse_args "$@"
    
    # Verify template
    aws_verify_template "$TEMPLATE_FILE" "$LOG_DIR"
    
    # Check/create S3 bucket if needed
    if [ -n "$S3_BUCKET" ]; then
        aws_check_s3_bucket "$S3_BUCKET" "$REGION"
    fi
    
    # Deploy stack
    deploy_stack
    
    # Print stack outputs
    log_info "Stack outputs:"
    aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query "Stacks[0].Outputs" \
        --output table
    
    # Save outputs to a file for later reference
    aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query "Stacks[0].Outputs" \
        --output json > "$LOG_DIR/stack-outputs.json"
    
    log_success "Stack deployment complete"
}

main "$@" 