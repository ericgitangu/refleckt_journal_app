#!/bin/bash

# Colors for logging
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

# Symbols
CHECK_MARK="\xE2\x9C\x85"
CROSS_MARK="\xE2\x9C\x97"
WARNING="\xE2\x9A\xA0"
INFO="\xE2\x84\xB9"

# Log levels
LOG_LEVEL_DEBUG=0
LOG_LEVEL_INFO=1
LOG_LEVEL_WARN=2
LOG_LEVEL_ERROR=3

# Default log level
LOG_LEVEL=${LOG_LEVEL:-$LOG_LEVEL_INFO}

# Get timestamp
get_timestamp() {
  date '+%Y-%m-%d %H:%M:%S.%N' | cut -b1-23
}

# Get caller info
get_caller_info() {
  local caller_file=$(basename "${BASH_SOURCE[2]}")
  local caller_line=${BASH_LINENO[1]}
  local caller_func=${FUNCNAME[2]}
  echo "${caller_file}:${caller_line} (${caller_func})"
}

# Base log function
log() {
  local level=$1
  local color=$2
  local symbol=$3
  local message=$4
  local timestamp=$(get_timestamp)
  local caller_info=$(get_caller_info)
  
  if [ $level -ge $LOG_LEVEL ]; then
    echo -e "${color}${symbol} [${timestamp}] [${caller_info}] ${message}${RESET}"
  fi
}

# Log functions with different levels
log_debug() {
  log $LOG_LEVEL_DEBUG "$BLUE" "$INFO" "DEBUG: $1"
}

log_info() {
  log $LOG_LEVEL_INFO "$BLUE" "$INFO" "INFO: $1"
}

log_success() {
  log $LOG_LEVEL_INFO "$GREEN" "$CHECK_MARK" "SUCCESS: $1"
}

log_warning() {
  log $LOG_LEVEL_WARN "$YELLOW" "$WARNING" "WARNING: $1"
}

log_error() {
  log $LOG_LEVEL_ERROR "$RED" "$CROSS_MARK" "ERROR: $1"
}

# Enhanced error handling
set -E
trap 'handle_error $? $LINENO' ERR

handle_error() {
  local exit_code=$1
  local line_no=$2
  local last_command=$(fc -ln -1)
  
  log_error "Command failed with exit code $exit_code"
  log_error "Last command: $last_command"
  log_error "Error occurred in $(get_caller_info)"
  
  # Print stack trace
  local frame=0
  while caller $frame; do
    ((frame++));
  done
  
  exit $exit_code
}

# Exit with error
fail() {
  log_error "$1"
  exit 1
}

# Check if command exists with better error message
check_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "Required command '$1' not found. Please install it and try again."
  fi
}

# Enhanced AWS credentials check
check_aws_credentials() {
  if ! aws sts get-caller-identity &>/dev/null; then
    fail "AWS credentials not configured or invalid. Please run 'aws configure' and verify your credentials."
  fi
  
  # Get and log AWS identity
  local identity=$(aws sts get-caller-identity --output json)
  log_info "Using AWS identity: $(echo "$identity" | jq -r '.Arn')"
}

# Check AWS SAM CLI with version verification
check_sam_cli() {
  check_command "sam"
  
  # Verify SAM CLI version
  local sam_version=$(sam --version)
  log_info "Using AWS SAM CLI version: $sam_version"
  
  # Check if version meets minimum requirements
  if [[ ! "$sam_version" =~ ^1\.([0-9]+) ]]; then
    log_warning "SAM CLI version may be outdated. Consider updating to the latest version."
  fi
}

# Enhanced environment variable check
check_env_var() {
  if [ -z "${!1}" ]; then
    fail "Required environment variable '$1' is not set. Please set it and try again."
  fi
  log_debug "Environment variable '$1' is set"
}

# Enhanced command execution with timeout
run_cmd() {
  local cmd="$1"
  local timeout="${2:-300}" # Default 5 minutes timeout
  
  log_info "Running: $cmd"
  
  # Run command with timeout
  if timeout "$timeout" bash -c "$cmd"; then
    log_success "Command completed successfully"
    return 0
  else
    local exit_code=$?
    if [ $exit_code -eq 124 ]; then
      log_error "Command timed out after ${timeout} seconds"
    else
      log_error "Command failed with exit code $exit_code"
    fi
    return $exit_code
  fi
}

# Enhanced endpoint check with timeout and retry backoff
wait_for_endpoint() {
  local endpoint="$1"
  local max_retries="${2:-30}"
  local retry_delay="${3:-2}"
  local timeout="${4:-5}"
  
  log_info "Waiting for endpoint: $endpoint"
  
  local retries=0
  local current_delay=$retry_delay
  
  while [ $retries -lt $max_retries ]; do
    if curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$endpoint" | grep -q -E "2[0-9][0-9]|3[0-9][0-9]"; then
      log_success "Endpoint $endpoint is available"
      return 0
    fi
    
    retries=$((retries + 1))
    log_warning "Endpoint not available yet, retrying in ${current_delay}s ($retries/$max_retries)"
    sleep $current_delay
    
    # Exponential backoff
    current_delay=$((current_delay * 2))
  done
  
  log_error "Endpoint $endpoint not available after $max_retries attempts"
  return 1
}

# Get absolute path to the project root with validation
get_project_root() {
  local root_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
  
  # Validate project structure
  if [ ! -f "$root_dir/package.json" ] && [ ! -f "$root_dir/requirements.txt" ]; then
    fail "Invalid project root directory: $root_dir"
  fi
  
  echo "$root_dir"
}

# Validate AWS region
validate_aws_region() {
  local region="$1"
  
  if ! aws ec2 describe-regions --region "$region" &>/dev/null; then
    fail "Invalid AWS region: $region"
  fi
  
  log_debug "Validated AWS region: $region"
}

# Validate stack name
validate_stack_name() {
  local stack_name="$1"
  
  if ! [[ "$stack_name" =~ ^[a-zA-Z0-9-]+$ ]]; then
    fail "Invalid stack name: $stack_name. Stack names can only contain letters, numbers, and hyphens."
  fi
  
  if [ ${#stack_name} -gt 128 ]; then
    fail "Stack name too long: $stack_name. Maximum length is 128 characters."
  fi
  
  log_debug "Validated stack name: $stack_name"
} 