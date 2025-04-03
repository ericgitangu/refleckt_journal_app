#!/bin/bash
set -eo pipefail

# Source common helper functions
SCRIPT_DIR="$(dirname "$0")"
source "$SCRIPT_DIR/common.sh"

# Script constants
LOG_DIR="$BACKEND_DIR/test-logs"
ENV_FILE="$BACKEND_DIR/.env"
TOKEN_FILE="$BACKEND_DIR/.token"
SPECIFIC_ENDPOINT=""
SAVE_RESPONSES=true
VERBOSE=true

# Create logs directory
mkdir -p "$LOG_DIR"
rm -rf "$LOG_DIR"/*

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -e|--endpoint)
                SPECIFIC_ENDPOINT="$2"
                shift 2
                ;;
            -r|--region)
                REGION="$2"
                shift 2
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -q|--quiet)
                VERBOSE=false
                shift
                ;;
            -h|--help)
                show_usage
                ;;
            *)
                shift
                ;;
        esac
    done
}

show_usage() {
    echo "Usage: $(basename "$0") [options]"
    echo "Options:"
    echo "  -e, --endpoint   Test specific endpoint (entries, settings, prompts, analytics, ai)"
    echo "  -r, --region     AWS Region (default: us-east-1)"
    echo "  -v, --verbose    Show detailed output (default)"
    echo "  -q, --quiet      Hide detailed output"
    echo "  -h, --help       Show this help message"
    exit 0
}

# Test HTTP endpoint with logging
test_endpoint() {
    local description="$1"
    local endpoint="$2"
    local method="${3:-GET}"
    local payload="$4"
    local expected_status="${5:-200}"
    
    log_info "Testing: $description ($method $endpoint)"
    
    local api_url="${API_URL:-$API_ENDPOINT}"
    if [ -z "$api_url" ]; then
        log_error "API URL not set. Make sure API_URL or API_ENDPOINT is defined in .env file"
        return 1
    fi
    
    local full_url="${api_url}${endpoint}"
    local log_file="$LOG_DIR/$(echo "${description// /_}" | tr '[:upper:]' '[:lower:]')-$(date +%s).log"
    local response_file="$LOG_DIR/$(echo "${description// /_}" | tr '[:upper:]' '[:lower:]')-response.json"
    
    # Build headers
    local headers="Content-Type: application/json"
    if [ -f "$TOKEN_FILE" ]; then
        local token=$(cat "$TOKEN_FILE")
        headers="$headers; Authorization: Bearer $token"
    fi
    
    # Log request details
    {
        echo "=== REQUEST ==="
        echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
        echo "Method: $method"
        echo "URL: $full_url"
        echo "Headers: $headers"
        [ -n "$payload" ] && echo -e "Payload:\n$payload"
        echo ""
    } > "$log_file"
    
    # Make the request
    local status_code
    local response_body
    
    if [ -n "$payload" ]; then
        # Request with payload
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            ${token:+-H "Authorization: Bearer $token"} \
            -d "$payload" \
            "$full_url" 2>>"$log_file")
    else
        # Request without payload
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            ${token:+-H "Authorization: Bearer $token"} \
            "$full_url" 2>>"$log_file")
    fi
    
    # Extract status code and body
    status_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | sed '$d')
    
    # Log response details
    {
        echo "=== RESPONSE ==="
        echo "Status Code: $status_code"
        echo -e "Body:\n$response_body"
        echo ""
    } >> "$log_file"
    
    # Save response body to a separate file for easier analysis
    if [ "$SAVE_RESPONSES" = true ]; then
        echo "$response_body" > "$response_file"
        [ "$VERBOSE" = true ] && echo "Response saved to: $response_file"
    fi
    
    # Check if status code matches expected
    if [ "$status_code" -eq "$expected_status" ]; then
        log_success "✓ $description - Status: $status_code"
        if [ "$VERBOSE" = true ]; then
            echo "  Response: $(echo "$response_body" | head -n 1)..."
            echo "  Log file: $log_file"
        fi
        return 0
    else
        log_error "✗ $description - Expected: $expected_status, Got: $status_code"
        echo "  Check log file for details: $log_file"
        return 1
    fi
}

# Test specific endpoint functions
test_entries_endpoints() {
    print_banner "TESTING ENTRIES SERVICE ENDPOINTS"
    
    # Test creating an entry
    local entry_payload='{
        "content": "This is a test journal entry with rich content. Testing the API integration with various details included.",
        "title": "API Test Entry",
        "mood": "happy",
        "tags": ["test", "journal", "api"],
        "weather": "sunny",
        "location": {"lat": 37.7749, "lng": -122.4194}
    }'
    
    test_endpoint "Create Entry" "/entries" "POST" "$entry_payload" 201
    
    # Get the ID from the response for subsequent tests
    local entry_id=""
    if [ -f "$LOG_DIR/create_entry-response.json" ]; then
        # Try to extract ID from JSON response
        if command -v jq &> /dev/null; then
            entry_id=$(jq -r '.id' "$LOG_DIR/create_entry-response.json" 2>/dev/null)
        else
            # Fallback to grep/sed if jq not available
            entry_id=$(grep -o '"id":"[^"]*"' "$LOG_DIR/create_entry-response.json" | head -1 | sed 's/"id":"//;s/"//')
        fi
    fi
    
    # Test list entries
    test_endpoint "List Entries" "/entries" "GET"
    
    # Test getting specific entry if ID was obtained
    if [ -n "$entry_id" ] && [ "$entry_id" != "null" ]; then
        test_endpoint "Get Entry" "/entries/$entry_id" "GET"
        
        # Test updating entry
        local update_payload='{
            "title": "Updated API Test Entry",
            "content": "This content has been updated with more details for testing",
            "tags": ["test", "updated", "api"],
            "mood": "excited"
        }'
        test_endpoint "Update Entry" "/entries/$entry_id" "PUT" "$update_payload"
        
        # Test searching entries
        test_endpoint "Search Entries" "/entries/search?q=test&tags=updated" "GET"
        
        # Test deleting entry
        test_endpoint "Delete Entry" "/entries/$entry_id" "DELETE" "" 204
    else
        log_warning "Could not extract entry ID for further tests"
    fi
    
    log_success "Entries service endpoints tested"
}

test_settings_endpoints() {
    print_banner "TESTING SETTINGS SERVICE ENDPOINTS"
    
    # Test get user settings
    test_endpoint "Get Settings" "/settings" "GET"
    
    # Test update settings
    local settings_payload='{
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
    test_endpoint "Update Settings" "/settings" "PUT" "$settings_payload"
    
    # Test getting categories
    test_endpoint "List Categories" "/settings/categories" "GET"
    
    # Test creating category
    local category_payload='{
        "name": "Test Category",
        "color": "#ff0000",
        "icon": "star",
        "description": "A test category for API testing"
    }'
    test_endpoint "Create Category" "/settings/categories" "POST" "$category_payload" 201
    
    log_success "Settings service endpoints tested"
}

test_prompts_endpoints() {
    print_banner "TESTING PROMPTS SERVICE ENDPOINTS"
    
    # Test list prompts
    test_endpoint "List Prompts" "/prompts" "GET"
    
    # Test getting random prompt
    test_endpoint "Get Random Prompt" "/prompts/random" "GET"
    
    # Test generating custom prompt
    local prompt_payload='{
        "theme": "reflection",
        "mood": "contemplative",
        "topics": ["gratitude", "personal growth"]
    }'
    test_endpoint "Generate Custom Prompt" "/prompts/generate" "POST" "$prompt_payload"
    
    log_success "Prompts service endpoints tested"
}

test_analytics_endpoints() {
    print_banner "TESTING ANALYTICS SERVICE ENDPOINTS"
    
    # Test get user analytics
    test_endpoint "Get Analytics" "/analytics" "GET"
    
    # Test mood analysis
    test_endpoint "Get Mood Analysis" "/analytics/mood" "GET"
    
    # Test entry frequency
    test_endpoint "Get Entry Frequency" "/analytics/frequency" "GET"
    
    # Test topics analysis
    test_endpoint "Get Topics Analysis" "/analytics/topics" "GET"
    
    log_success "Analytics service endpoints tested"
}

test_ai_endpoints() {
    print_banner "TESTING AI SERVICE ENDPOINTS"
    
    # Test sentiment analysis
    local sentiment_payload='{
        "text": "Today was a great day. I completed my project and felt really accomplished."
    }'
    test_endpoint "Sentiment Analysis" "/ai/analyze/sentiment" "POST" "$sentiment_payload"
    
    # Test topic extraction
    local topic_payload='{
        "text": "I spent time with my family today. We went hiking and had a picnic by the lake."
    }'
    test_endpoint "Topic Extraction" "/ai/analyze/topics" "POST" "$topic_payload"
    
    # Test content suggestions
    local suggestions_payload='{
        "text": "I started a new book but I'm not sure",
        "type": "completion"
    }'
    test_endpoint "Content Suggestions" "/ai/suggest" "POST" "$suggestions_payload"
    
    log_success "AI service endpoints tested"
}

# Main execution
main() {
    print_banner "TESTING API ENDPOINTS"
    
    # Parse command line arguments
    parse_args "$@"
    
    # Load environment variables
    if [ -f "$ENV_FILE" ]; then
        source "$ENV_FILE"
        log_info "Loaded environment from $ENV_FILE"
    else
        log_warning "Environment file not found: $ENV_FILE"
        log_info "Using environment variables if set"
    fi
    
    # Check for API URL
    if [ -z "${API_URL:-}" ] && [ -z "${API_ENDPOINT:-}" ]; then
        log_error "API URL not set. Please set API_URL or API_ENDPOINT environment variable"
        exit 1
    fi
    
    # Check for authentication token
    if [ -f "$TOKEN_FILE" ]; then
        log_info "Using auth token from $TOKEN_FILE"
    else
        log_warning "Token file not found: $TOKEN_FILE"
        log_warning "Some endpoints may require authentication"
    fi
    
    # Test health endpoint first
    test_endpoint "API Health Check" "/health" "GET"
    
    # Test specific or all endpoints
    if [ -n "$SPECIFIC_ENDPOINT" ]; then
        log_info "Testing specific endpoint: $SPECIFIC_ENDPOINT"
        
        case "$SPECIFIC_ENDPOINT" in
            entries)
                test_entries_endpoints
                ;;
            settings)
                test_settings_endpoints
                ;;
            prompts)
                test_prompts_endpoints
                ;;
            analytics)
                test_analytics_endpoints
                ;;
            ai)
                test_ai_endpoints
                ;;
            *)
                log_error "Unknown endpoint: $SPECIFIC_ENDPOINT"
                log_info "Valid endpoints: entries, settings, prompts, analytics, ai"
                exit 1
                ;;
        esac
    else
        # Test all endpoints
        test_entries_endpoints
        test_settings_endpoints
        test_prompts_endpoints
        test_analytics_endpoints
        test_ai_endpoints
    fi
    
    log_success "API endpoint testing complete"
    log_info "Test logs saved to: $LOG_DIR"
}

main "$@" 