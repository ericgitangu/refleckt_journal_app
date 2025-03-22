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

# Log functions
log_info() {
  echo -e "${BLUE}${INFO} INFO: $1${RESET}"
}

log_success() {
  echo -e "${GREEN}${CHECK_MARK} SUCCESS: $1${RESET}"
}

log_warning() {
  echo -e "${YELLOW}${WARNING} WARNING: $1${RESET}"
}

log_error() {
  echo -e "${RED}${CROSS_MARK} ERROR: $1${RESET}"
}

# Exit with error
fail() {
  log_error "$1"
  exit 1
}

# Check if command exists
check_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command '$1' not found"
}

# Check if AWS credentials are configured
check_aws_credentials() {
  if ! aws sts get-caller-identity &>/dev/null; then
    fail "AWS credentials not configured. Run 'aws configure' first."
  fi
}

# Check if AWS SAM CLI is installed
check_sam_cli() {
  check_command "sam"
}

# Check environment variables
check_env_var() {
  if [ -z "${!1}" ]; then
    fail "Environment variable $1 is not set"
  fi
}

# Run command and check result
run_cmd() {
  log_info "Running: $1"
  if eval "$1"; then
    log_success "Command completed successfully"
    return 0
  else
    local exit_code=$?
    log_error "Command failed with exit code $exit_code"
    return $exit_code
  fi
}

# Wait for service endpoint
wait_for_endpoint() {
  local endpoint="$1"
  local max_retries="${2:-30}"
  local retry_delay="${3:-2}"
  
  log_info "Waiting for endpoint: $endpoint"
  
  local retries=0
  while [ $retries -lt $max_retries ]; do
    if curl -s -o /dev/null -w "%{http_code}" "$endpoint" | grep -q -E "2[0-9][0-9]|3[0-9][0-9]"; then
      log_success "Endpoint $endpoint is available"
      return 0
    fi
    
    retries=$((retries + 1))
    log_warning "Endpoint not available yet, retrying in ${retry_delay}s ($retries/$max_retries)"
    sleep $retry_delay
  done
  
  log_error "Endpoint $endpoint not available after $max_retries attempts"
  return 1
}

# Get absolute path to the project root
get_project_root() {
  echo "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
} 