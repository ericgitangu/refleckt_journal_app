#!/bin/bash

# Import utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

# Create debug directory if it doesn't exist
DEBUG_DIR="$SCRIPT_DIR/../debug"
mkdir -p "$DEBUG_DIR"

# Function to log debug information
log_debug() {
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    local message="$1"
    local type="${2:-INFO}"
    local log_file="$DEBUG_DIR/debug.log"
    
    echo "[$timestamp] [$type] $message" >> "$log_file"
}

# Function to log AWS command outputs
log_aws_output() {
    local command="$1"
    local output="$2"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    local log_file="$DEBUG_DIR/aws-commands.log"
    
    echo "[$timestamp] Command: $command" >> "$log_file"
    echo "Output:" >> "$log_file"
    echo "$output" >> "$log_file"
    echo "----------------------------------------" >> "$log_file"
}

# Function to log CloudFormation events
log_cf_events() {
    local stack_name="$1"
    local events_file="$DEBUG_DIR/cf-events-$stack_name-$(date +"%Y%m%d-%H%M%S").log"
    
    aws cloudformation describe-stack-events \
        --stack-name "$stack_name" \
        --query 'StackEvents[*].[Timestamp,LogicalResourceId,ResourceStatus,ResourceStatusReason]' \
        --output table > "$events_file"
    
    log_debug "CloudFormation events for stack $stack_name saved to $events_file" "CF"
}

# Function to log API Gateway requests
log_api_request() {
    local request_id="$1"
    local method="$2"
    local path="$3"
    local status="$4"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    local log_file="$DEBUG_DIR/api-requests.log"
    
    echo "[$timestamp] Request ID: $request_id" >> "$log_file"
    echo "Method: $method" >> "$log_file"
    echo "Path: $path" >> "$log_file"
    echo "Status: $status" >> "$log_file"
    echo "----------------------------------------" >> "$log_file"
}

# Function to log Lambda execution
log_lambda_execution() {
    local function_name="$1"
    local request_id="$2"
    local duration="$3"
    local status="$4"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    local log_file="$DEBUG_DIR/lambda-executions.log"
    
    echo "[$timestamp] Function: $function_name" >> "$log_file"
    echo "Request ID: $request_id" >> "$log_file"
    echo "Duration: $duration ms" >> "$log_file"
    echo "Status: $status" >> "$log_file"
    echo "----------------------------------------" >> "$log_file"
}

# Function to log CORS issues
log_cors_issue() {
    local origin="$1"
    local method="$2"
    local path="$3"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    local log_file="$DEBUG_DIR/cors-issues.log"
    
    echo "[$timestamp] CORS Issue Detected" >> "$log_file"
    echo "Origin: $origin" >> "$log_file"
    echo "Method: $method" >> "$log_file"
    echo "Path: $path" >> "$log_file"
    echo "----------------------------------------" >> "$log_file"
}

# Function to log AWS X-Ray traces
log_xray_trace() {
    local trace_id="$1"
    local segment_id="$2"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    local log_file="$DEBUG_DIR/xray-traces.log"
    
    echo "[$timestamp] Trace ID: $trace_id" >> "$log_file"
    echo "Segment ID: $segment_id" >> "$log_file"
    echo "----------------------------------------" >> "$log_file"
} 