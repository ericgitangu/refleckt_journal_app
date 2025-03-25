#!/bin/bash
set -eo pipefail

# Source common helper functions
SCRIPT_DIR="$(dirname "$0")"
source "$SCRIPT_DIR/common.sh"

# Script constants
LOG_DIR="$BACKEND_DIR/build-logs"
REQUIRED_SPACE_MB=500

# Create logs directory
mkdir -p "$LOG_DIR"
rm -rf "$LOG_DIR"/*

# Build services function
build_services() {
    print_banner "BUILDING ALL SERVICES"
    
    # Check for available space
    check_available_space "$REQUIRED_SPACE_MB"
    
    # Build common library first if it exists
    if [ -d "$BACKEND_DIR/common" ]; then
        log_info "Building common library..."
        (cd "$BACKEND_DIR/common" && cargo build --release) > "$LOG_DIR/common-build.log" 2>&1
        
        if [ $? -ne 0 ]; then
            log_error "Failed to build common library. See $LOG_DIR/common-build.log for details."
            exit 1
        fi
        
        log_success "Common library built successfully."
    fi
    
    # List of services to build
    local services=("entry-service" "analytics-service" "ai-service" "settings-service" "authorizer" "prompts-service")
    
    # Build each service
    for service in "${services[@]}"; do
        log_info "Building $service..."
        
        # Skip if service directory doesn't exist
        if [ ! -d "$BACKEND_DIR/$service" ]; then
            log_warning "Service directory $service not found, skipping."
            continue
        fi
        
        # Build service
        (cd "$BACKEND_DIR/$service" && cargo build --release) > "$LOG_DIR/$service-build.log" 2>&1
        
        if [ $? -ne 0 ]; then
            log_error "Failed to build $service. See $LOG_DIR/$service-build.log for details."
            exit 1
        fi
        
        log_success "$service built successfully."
    done
    
    log_success "All services built successfully."
}

# Main function
main() {
    print_banner "REFLEKT JOURNAL APP BUILD PROCESS"
    
    # Check prerequisites
    check_prerequisites
    
    # Build all services
    build_services
    
    log_success "Build process complete."
}

main "$@" 