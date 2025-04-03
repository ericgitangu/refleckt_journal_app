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
    
    # Define target architecture (support ARM64 for M1/M2 Macs)
    TARGET=${TARGET:-"aarch64-unknown-linux-musl"}
    LAMBDA_RUNTIME=${LAMBDA_RUNTIME:-"provided.al2023"}
    
    # Check if cargo-lambda is installed
    if ! command -v cargo-lambda &> /dev/null; then
        log_info "Installing cargo-lambda..."
        cargo install cargo-lambda
        if [ $? -ne 0 ]; then
            log_error "Failed to install cargo-lambda. Please install it manually."
            exit 1
        fi
    fi
    
    # Add the target to rustup
    rustup target add "$TARGET"
    
    # Build common library first if it exists
    if [ -d "$BACKEND_DIR/common" ]; then
        log_info "Building common library..."
        (cd "$BACKEND_DIR/common" && cargo build --release --target "$TARGET") > "$LOG_DIR/common-build.log" 2>&1
        
        if [ $? -ne 0 ]; then
            log_error "Failed to build common library. See $LOG_DIR/common-build.log for details."
            cat "$LOG_DIR/common-build.log"
            exit 1
        fi
        
        log_success "Common library built successfully."
    fi
    
    # List of services to build
    local services=(
        "authorizer"
        "entry-service"
        "analytics-service"
        "ai-service" 
        "settings-service"
        "prompts-service"
    )
    
    # Build each service with cargo-lambda
    for service in "${services[@]}"; do
        log_info "Building $service with cargo-lambda..."
        
        # Skip if service directory doesn't exist
        if [ ! -d "$BACKEND_DIR/$service" ]; then
            log_warning "Service directory $service not found, skipping."
            continue
        fi
        
        # Build using Makefile if available
        if [ -f "$BACKEND_DIR/$service/Makefile" ]; then
            log_info "Using Makefile to build $service..."
            (cd "$BACKEND_DIR/$service" && make build-musl TARGET="$TARGET") > "$LOG_DIR/$service-build.log" 2>&1
        else
            # Build with cargo-lambda
            log_info "No Makefile found, using cargo-lambda to build $service..."
            (cd "$BACKEND_DIR/$service" && cargo lambda build --release --target "$TARGET" --lambda-runtime "$LAMBDA_RUNTIME") > "$LOG_DIR/$service-build.log" 2>&1
        fi
        
        if [ $? -ne 0 ]; then
            log_error "Failed to build $service. See $LOG_DIR/$service-build.log for details."
            cat "$LOG_DIR/$service-build.log"
            exit 1
        fi
        
        log_success "$service built successfully."
        
        # Verify Lambda package exists
        if [ -d "$BACKEND_DIR/$service/target/lambda" ]; then
            log_info "Lambda package exists for $service"
        else
            log_warning "No Lambda package found for $service. Check build output."
        fi
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
    log_info "Check build logs in $LOG_DIR for details."
    log_info "To test endpoints, run: ./scripts/test-endpoints.sh"
}

main "$@" 