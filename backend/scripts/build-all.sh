#!/bin/bash
# Script to build all Lambda services in the backend for WSL2 Ubuntu environment

set -e

# Directory containing this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

# Source utils.sh for helper functions
source "$SCRIPT_DIR/utils.sh"

# Make sure the build directory exists
mkdir -p "$BACKEND_DIR/build-logs"

# Target architecture based on environment variable or default
TARGET=${TARGET:-"aarch64-unknown-linux-musl"}
LAMBDA_RUNTIME=${LAMBDA_RUNTIME:-"provided.al2023"}

# Services to build in order (common must be first)
SERVICES=(
    "common"
    "authorizer"
    "analytics-service"
    "ai-service"
    "entry-service"
    "settings-service"
    "prompts-service"
)

# Setup Lambda build environment
setup_lambda_build() {
    log_info "Setting up Lambda build environment for WSL2 Ubuntu..."
    
    # Install cargo-lambda if not already installed
    if ! command -v cargo-lambda &> /dev/null; then
        log_info "Installing cargo-lambda..."
        cargo install cargo-lambda
        if [ $? -ne 0 ]; then
            log_error "Failed to install cargo-lambda. Please install it manually."
            exit 1
        fi
    fi
    
    # Add target to rustup
    rustup target add "$TARGET"
    
    # Install required packages for ARM64 in WSL2 Ubuntu
    if [[ "$TARGET" == *"aarch64"* ]]; then
        if ! dpkg -l | grep -q "gcc-aarch64-linux-gnu"; then
            log_info "Installing ARM64 cross-compilation tools in WSL2..."
            sudo apt-get update
            sudo apt-get install -y gcc-aarch64-linux-gnu
        fi
    fi
    
    log_success "Lambda build environment set up for $TARGET"
}

# Build the common library 
build_common() {
    log_info "Building common library..."
    
    cd "$BACKEND_DIR/common"
    
    if [ -f "Makefile" ]; then
        make build TARGET="$TARGET" 2>&1 | tee "$BACKEND_DIR/build-logs/common-build.log"
    else
        # Since the common library isn't a Lambda function, just use cargo build
        log_info "No Makefile found, using cargo build..."
        cargo build --release --target "$TARGET" 2>&1 | tee "$BACKEND_DIR/build-logs/common-build.log"
    fi
    
    if [ ${PIPESTATUS[0]} -ne 0 ]; then
        log_error "Failed to build common library. See build-logs/common-build.log for details."
        exit 1
    fi
    
    log_success "Common library built successfully"
    
    cd "$BACKEND_DIR"
}

# Build a service with cargo-lambda
build_service_lambda() {
    local service="$1"
    
    # Skip if it's the common library (already built separately)
    if [ "$service" == "common" ]; then
        return 0
    fi
    
    log_info "Building $service with cargo-lambda..."
    
    # Check if service directory exists and has a Cargo.toml
    if [ ! -d "$BACKEND_DIR/$service" ] || [ ! -f "$BACKEND_DIR/$service/Cargo.toml" ]; then
        log_info "Skipping $service (not a valid Rust project)"
        return 0
    fi
    
    cd "$BACKEND_DIR/$service"
    
    if [ -f "Makefile" ]; then
        # Use make if Makefile exists
        log_info "Using Makefile to build $service..."
        
        # Check which make targets are available
        if grep -q "build-lambda:" Makefile; then
            make build-lambda TARGET="$TARGET" LAMBDA_RUNTIME="$LAMBDA_RUNTIME" 2>&1 | tee "$BACKEND_DIR/build-logs/$service-build.log"
        elif grep -q "package:" Makefile; then
            make package TARGET="$TARGET" 2>&1 | tee "$BACKEND_DIR/build-logs/$service-build.log"
        else
            # If neither target exists, just use 'all'
            make all TARGET="$TARGET" 2>&1 | tee "$BACKEND_DIR/build-logs/$service-build.log"
        fi
    else
        # Use cargo-lambda for building
        log_info "No Makefile found, using cargo-lambda build..."
        cargo lambda build --release --target "$TARGET" --lambda-runtime "$LAMBDA_RUNTIME" 2>&1 | tee "$BACKEND_DIR/build-logs/$service-build.log"
    fi
    
    if [ ${PIPESTATUS[0]} -ne 0 ]; then
        log_error "Failed to build $service. See build-logs/$service-build.log for details."
        exit 1
    fi
    
    log_success "$service built successfully with cargo-lambda"
    
    # Check if Lambda package exists
    if [ -d "$BACKEND_DIR/$service/target/lambda/$service" ]; then
        log_info "Lambda package exists for $service"
    else
        log_warning "No Lambda package found for $service. Check build output."
    fi
    
    cd "$BACKEND_DIR"
}

# Main function
main() {
    log_info "Building all services for Refleckt Journal App backend with cargo-lambda..."
    log_info "Target architecture: $TARGET (WSL2 Ubuntu environment)"
    
    # Setup Lambda build environment
    setup_lambda_build
    
    # First, build the common library
    build_common
    
    # Then build all other services with cargo-lambda
    for service in "${SERVICES[@]}"; do
        if [ "$service" != "common" ]; then
            build_service_lambda "$service"
        fi
    done
    
    log_success "All services built successfully with cargo-lambda!"
}

# Run the main function
main "$@"