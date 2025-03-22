#!/bin/bash

# Import utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

# Check for required tools
check_command "curl"
check_command "jq"

# Default values
API_URL=""
JWT_TOKEN=""
VERBOSE=false

# Parse command-line arguments
while getopts "a:t:v" opt; do
  case $opt in
    a) API_URL="$OPTARG" ;;
    t) JWT_TOKEN="$OPTARG" ;;
    v) VERBOSE=true ;;
    \?) log_error "Invalid option: -$OPTARG"; exit 1 ;;
  esac
done

# Validate required parameters
if [ -z "$API_URL" ]; then
  if [ -n "$API_URL_ENV" ]; then
    API_URL="$API_URL_ENV"
  else
    fail "API URL is required. Use -a option or set API_URL_ENV environment variable."
  fi
fi

# Function to make API requests
make_request() {
  local method="$1"
  local endpoint="$2"
  local data="$3"
  local description="$4"
  local expected_status="$5"
  
  local curl_cmd="curl -s -X $method"
  local headers="-H 'Content-Type: application/json'"
  
  if [ -n "$JWT_TOKEN" ]; then
    headers="$headers -H 'Authorization: Bearer $JWT_TOKEN'"
  fi
  
  if [ -n "$data" ]; then
    curl_cmd="$curl_cmd $headers -d '$data'"
  else
    curl_cmd="$curl_cmd $headers"
  fi
  
  curl_cmd="$curl_cmd -w '%{http_code}' -o /tmp/response.json \"$API_URL$endpoint\""
  
  log_info "Testing: $description ($method $endpoint)"
  if $VERBOSE; then
    log_info "Command: $curl_cmd"
  fi
  
  local response_code=$(eval "$curl_cmd")
  local response=$(cat /tmp/response.json)
  
  if [ "$response_code" = "$expected_status" ]; then
    log_success "✓ $description - Status: $response_code"
    if $VERBOSE && [ -s "/tmp/response.json" ]; then
      echo "Response:"
      jq . /tmp/response.json
    fi
    return 0
  else
    log_error "✗ $description - Expected: $expected_status, Got: $response_code"
    if [ -s "/tmp/response.json" ]; then
      echo "Response:"
      jq . /tmp/response.json
    fi
    return 1
  fi
}

# Test health endpoints
test_health() {
  log_info "Testing health endpoints"
  make_request "GET" "/health" "" "Global health check" "200"
  
  local services=("entry" "settings" "analytics" "ai")
  for service in "${services[@]}"; do
    make_request "GET" "/health/$service" "" "$service health check" "200"
  done
}

# Test entries endpoints
test_entries() {
  log_info "Testing entries endpoints"
  
  # Get entries
  make_request "GET" "/entries" "" "List entries" "200"
  
  # Create entry
  local entry_data='{"title":"Test Entry","content":"This is a test entry","category_id":"default"}'
  make_request "POST" "/entries" "$entry_data" "Create entry" "201"
  
  # If creation was successful, get the ID and test other operations
  if [ $? -eq 0 ]; then
    local entry_id=$(jq -r '.id' /tmp/response.json)
    
    if [ -n "$entry_id" ] && [ "$entry_id" != "null" ]; then
      # Get specific entry
      make_request "GET" "/entries/$entry_id" "" "Get entry by ID" "200"
      
      # Update entry
      local update_data='{"title":"Updated Test Entry","content":"This content has been updated"}'
      make_request "PUT" "/entries/$entry_id" "$update_data" "Update entry" "200"
      
      # Delete entry
      make_request "DELETE" "/entries/$entry_id" "" "Delete entry" "204"
    fi
  fi
  
  # Test search
  make_request "GET" "/entries/search?q=test" "" "Search entries" "200"
}

# Test settings endpoints
test_settings() {
  log_info "Testing settings endpoints"
  
  # Get settings
  make_request "GET" "/settings" "" "Get settings" "200"
  
  # Update settings
  local settings_data='{"theme":"dark","notifications":true}'
  make_request "PUT" "/settings" "$settings_data" "Update settings" "200"
  
  # Get categories
  make_request "GET" "/settings/categories" "" "List categories" "200"
  
  # Create category
  local category_data='{"name":"Test Category","color":"#ff0000"}'
  make_request "POST" "/settings/categories" "$category_data" "Create category" "201"
  
  # If creation was successful, get the ID and test other operations
  if [ $? -eq 0 ]; then
    local category_id=$(jq -r '.id' /tmp/response.json)
    
    if [ -n "$category_id" ] && [ "$category_id" != "null" ]; then
      # Update category
      local update_data='{"name":"Updated Test Category","color":"#00ff00"}'
      make_request "PUT" "/settings/categories/$category_id" "$update_data" "Update category" "200"
      
      # Delete category
      make_request "DELETE" "/settings/categories/$category_id" "" "Delete category" "204"
    fi
  fi
}

# Test analytics endpoints
test_analytics() {
  log_info "Testing analytics endpoints"
  
  # Get analytics
  make_request "GET" "/analytics" "" "Get analytics" "200"
  
  # Request analytics
  make_request "POST" "/analytics" "" "Request analytics generation" "202"
  
  # Get mood analysis
  make_request "GET" "/analytics/mood" "" "Get mood analysis" "200"
}

# Run all tests
run_all_tests() {
  local failures=0
  
  test_health || ((failures++))
  test_entries || ((failures++))
  test_settings || ((failures++))
  test_analytics || ((failures++))
  
  if [ $failures -eq 0 ]; then
    log_success "All tests passed!"
    return 0
  else
    log_error "$failures test groups had failures"
    return 1
  fi
}

# Start the tests
log_info "Starting API endpoint testing against $API_URL"
run_all_tests
exit $? 