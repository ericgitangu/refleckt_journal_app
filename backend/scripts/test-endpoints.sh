#!/bin/bash

# Import utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

# Check for required tools
check_command "curl"
check_command "jq"
check_command "ab" # Apache Benchmark for load testing

# Default values
API_URL=""
JWT_TOKEN=""
VERBOSE=false
LOAD_TEST=false
CONCURRENT_USERS=10
TOTAL_REQUESTS=100
TEST_DATA_DIR=""
CONTRACT_TEST=false
SAVE_RESPONSES=false
TIMEOUT=30

# Parse command-line arguments
while getopts "a:t:vld:c:n:r:p:s" opt; do
  case $opt in
    a) API_URL="$OPTARG" ;;
    t) JWT_TOKEN="$OPTARG" ;;
    v) VERBOSE=true ;;
    l) LOAD_TEST=true ;;
    d) TEST_DATA_DIR="$OPTARG" ;;
    c) CONCURRENT_USERS="$OPTARG" ;;
    n) TOTAL_REQUESTS="$OPTARG" ;;
    r) CONTRACT_TEST=true ;;
    p) SAVE_RESPONSES=true ;;
    s) TIMEOUT="$OPTARG" ;;
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

# Set up test data directory
if [ -z "$TEST_DATA_DIR" ]; then
  TEST_DATA_DIR="$(mktemp -d)"
  trap 'rm -rf "$TEST_DATA_DIR"' EXIT
fi

# Function to make API requests with enhanced error handling and response saving
make_request() {
  local method="$1"
  local endpoint="$2"
  local data="$3"
  local description="$4"
  local expected_status="$5"
  local response_file="$6"
  
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
  
  curl_cmd="$curl_cmd -w '%{http_code}' -o /tmp/response.json --max-time $TIMEOUT \"$API_URL$endpoint\""
  
  log_info "Testing: $description ($method $endpoint)"
  if $VERBOSE; then
    log_info "Command: $curl_cmd"
  fi
  
  local response_code=$(eval "$curl_cmd")
  local response=$(cat /tmp/response.json)
  
  # Save response if requested
  if [ "$SAVE_RESPONSES" = true ] && [ -n "$response_file" ]; then
    echo "$response" > "$TEST_DATA_DIR/$response_file"
  fi
  
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

# Function to perform load testing
run_load_test() {
  local endpoint="$1"
  local method="$2"
  local data="$3"
  local description="$4"
  
  log_info "Running load test for $description"
  
  # Create temporary file for POST data if needed
  local post_file=""
  if [ -n "$data" ]; then
    post_file=$(mktemp)
    echo "$data" > "$post_file"
  fi
  
  # Run Apache Benchmark
  local ab_cmd="ab -n $TOTAL_REQUESTS -c $CONCURRENT_USERS"
  if [ -n "$JWT_TOKEN" ]; then
    ab_cmd="$ab_cmd -H 'Authorization: Bearer $JWT_TOKEN'"
  fi
  if [ -n "$post_file" ]; then
    ab_cmd="$ab_cmd -p $post_file -T 'application/json'"
  fi
  ab_cmd="$ab_cmd $API_URL$endpoint"
  
  log_info "Running: $ab_cmd"
  eval "$ab_cmd"
  
  # Clean up
  if [ -n "$post_file" ]; then
    rm -f "$post_file"
  fi
}

# Function to validate API contract
validate_contract() {
  local endpoint="$1"
  local method="$2"
  local schema_file="$3"
  
  log_info "Validating API contract for $method $endpoint"
  
  # Make request and save response
  make_request "$method" "$endpoint" "" "Contract validation" "200" "contract_response.json"
  
  # Validate against schema using jq
  if jq -f "$schema_file" "$TEST_DATA_DIR/contract_response.json" > /dev/null; then
    log_success "Contract validation passed"
    return 0
  else
    log_error "Contract validation failed"
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

# Test entries endpoints with enhanced test data
test_entries() {
  log_info "Testing entries endpoints"
  
  # Get entries
  make_request "GET" "/entries" "" "List entries" "200" "entries_list.json"
  
  # Create test entry with rich content
  local entry_data='{
    "title": "Test Entry",
    "content": "This is a test entry with rich content",
    "category_id": "default",
    "tags": ["test", "automation"],
    "mood": "happy",
    "weather": "sunny",
    "location": {"lat": 37.7749, "lng": -122.4194}
  }'
  
  make_request "POST" "/entries" "$entry_data" "Create entry" "201" "entry_created.json"
  
  # If creation was successful, get the ID and test other operations
  if [ $? -eq 0 ]; then
    local entry_id=$(jq -r '.id' "$TEST_DATA_DIR/entry_created.json")
    
    if [ -n "$entry_id" ] && [ "$entry_id" != "null" ]; then
      # Get specific entry
      make_request "GET" "/entries/$entry_id" "" "Get entry by ID" "200" "entry_get.json"
      
      # Update entry with more fields
      local update_data='{
        "title": "Updated Test Entry",
        "content": "This content has been updated with more details",
        "tags": ["test", "automation", "updated"],
        "mood": "excited",
        "weather": "partly_cloudy"
      }'
      make_request "PUT" "/entries/$entry_id" "$update_data" "Update entry" "200" "entry_updated.json"
      
      # Test search with various parameters
      make_request "GET" "/entries/search?q=test&tags=automation&mood=excited" "" "Search entries" "200" "entries_search.json"
      
      # Delete entry
      make_request "DELETE" "/entries/$entry_id" "" "Delete entry" "204"
    fi
  fi
}

# Test settings endpoints with enhanced validation
test_settings() {
  log_info "Testing settings endpoints"
  
  # Get settings
  make_request "GET" "/settings" "" "Get settings" "200" "settings_get.json"
  
  # Update settings with comprehensive options
  local settings_data='{
    "theme": "dark",
    "notifications": true,
    "email_frequency": "daily",
    "timezone": "UTC",
    "language": "en",
    "accessibility": {
      "high_contrast": true,
      "font_size": "large"
    }
  }'
  make_request "PUT" "/settings" "$settings_data" "Update settings" "200" "settings_updated.json"
  
  # Get categories
  make_request "GET" "/settings/categories" "" "List categories" "200" "categories_list.json"
  
  # Create category with rich metadata
  local category_data='{
    "name": "Test Category",
    "color": "#ff0000",
    "icon": "star",
    "description": "A test category for automation",
    "is_default": false
  }'
  make_request "POST" "/settings/categories" "$category_data" "Create category" "201" "category_created.json"
  
  # If creation was successful, get the ID and test other operations
  if [ $? -eq 0 ]; then
    local category_id=$(jq -r '.id' "$TEST_DATA_DIR/category_created.json")
    
    if [ -n "$category_id" ] && [ "$category_id" != "null" ]; then
      # Update category
      local update_data='{
        "name": "Updated Test Category",
        "color": "#00ff00",
        "icon": "heart",
        "description": "An updated test category"
      }'
      make_request "PUT" "/settings/categories/$category_id" "$update_data" "Update category" "200" "category_updated.json"
      
      # Delete category
      make_request "DELETE" "/settings/categories/$category_id" "" "Delete category" "204"
    fi
  fi
}

# Test analytics endpoints with enhanced data validation
test_analytics() {
  log_info "Testing analytics endpoints"
  
  # Get analytics
  make_request "GET" "/analytics" "" "Get analytics" "200" "analytics_get.json"
  
  # Request analytics generation
  make_request "POST" "/analytics" "" "Request analytics generation" "202" "analytics_request.json"
  
  # Get mood analysis with date range
  make_request "GET" "/analytics/mood?start_date=2024-01-01&end_date=2024-12-31" "" "Get mood analysis" "200" "mood_analysis.json"
  
  # Validate analytics data structure
  if [ "$CONTRACT_TEST" = true ]; then
    validate_contract "/analytics" "GET" "schemas/analytics_schema.json"
    validate_contract "/analytics/mood" "GET" "schemas/mood_analysis_schema.json"
  fi
}

# Run load tests if requested
run_load_tests() {
  if [ "$LOAD_TEST" = true ]; then
    log_info "Starting load tests"
    
    # Test health endpoint
    run_load_test "/health" "GET" "" "Health endpoint"
    
    # Test entries listing
    run_load_test "/entries" "GET" "" "Entries listing"
    
    # Test settings retrieval
    run_load_test "/settings" "GET" "" "Settings retrieval"
    
    # Test analytics endpoint
    run_load_test "/analytics" "GET" "" "Analytics endpoint"
  fi
}

# Run all tests
run_all_tests() {
  local failures=0
  
  test_health || ((failures++))
  test_entries || ((failures++))
  test_settings || ((failures++))
  test_analytics || ((failures++))
  
  if [ "$LOAD_TEST" = true ]; then
    run_load_tests
  fi
  
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