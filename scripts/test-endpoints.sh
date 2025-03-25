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

# Create logs directory
mkdir -p "$LOG_DIR"

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
    echo "  -h, --help       Show this help message"
    exit 0
}

# Test specific endpoint functions
test_entries_endpoints() {
    print_banner "TESTING ENTRIES SERVICE ENDPOINTS"
    
    # Test creating an entry
    local entry_payload='{
        "content": "This is a test journal entry",
        "title": "Test Entry",
        "mood": "happy",
        "tags": ["test", "journal"]
    }'
    
    test_endpoint "Create Entry" "/entries" "POST" "$entry_payload" 201
    
    # Test list entries
    test_endpoint "List Entries" "/entries" "GET"
    
    log_success "Entries service endpoints tested"
}

test_settings_endpoints() {
    print_banner "TESTING SETTINGS SERVICE ENDPOINTS"
    
    # Test get user settings
    test_endpoint "Get Settings" "/settings" "GET"
    
    log_success "Settings service endpoints tested"
}

test_prompts_endpoints() {
    print_banner "TESTING PROMPTS SERVICE ENDPOINTS"
    
    # Test list prompts
    test_endpoint "List Prompts" "/prompts" "GET"
    
    log_success "Prompts service endpoints tested"
}

test_analytics_endpoints() {
    print_banner "TESTING ANALYTICS SERVICE ENDPOINTS"
    
    # Test get user analytics
    test_endpoint "Get Analytics" "/analytics" "GET"
    
    log_success "Analytics service endpoints tested"
}

test_ai_endpoints() {
    print_banner "TESTING AI SERVICE ENDPOINTS"
    
    # Test AI services
    local ai_payload='{
        "text": "Today was a great day. I completed my project."
    }'
    
    test_endpoint "AI Analysis" "/ai/analyze" "POST" "$ai_payload"
    
    log_success "AI service endpoints tested"
}

# Main execution
main() {
    print_banner "TESTING API ENDPOINTS"
    
    # Parse command line arguments
    parse_args "$@"
    
    # Load environment and token
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file not found: $ENV_FILE"
        exit 1
    fi
    
    source "$ENV_FILE"
    
    if [ ! -f "$TOKEN_FILE" ]; then
        log_error "Token file not found: $TOKEN_FILE"
        exit 1
    fi
    
    AUTH_TOKEN=$(cat "$TOKEN_FILE")
    
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
}

main "$@" 