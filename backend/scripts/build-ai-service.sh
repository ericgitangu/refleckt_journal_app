#!/bin/bash
set -eo pipefail

SCRIPT_DIR="$(dirname "$0")"
source "$SCRIPT_DIR/common.sh"
source "$SCRIPT_DIR/set_env.sh"

# Set BUILD_AI_SERVICE to ensure PyTorch environment variables are set
export BUILD_AI_SERVICE=true

log_info "Building AI service with PyTorch support..."

# Set libtorch download flag to download prebuilt libraries if needed
export LIBTORCH_DOWNLOAD=1

cd "$BACKEND_DIR/ai-service"

# Attempt to build with standard cargo
if [ "$TARGET" == "aarch64-unknown-linux-musl" ]; then
    log_info "Cross-compiling for aarch64 with PyTorch..."
    
    # Try to build with static linking
    cargo build --release --target "$TARGET" 2>&1 
    
    if [ $? -ne 0 ]; then
        log_warning "Cross-compilation with PyTorch failed. Trying with simplified features..."
        
        # If that fails, try with a feature flag that avoids torch dependencies
        if grep -q 'features.*no-torch' Cargo.toml; then
            cargo build --release --target "$TARGET" --no-default-features --features="no-torch" 2>&1
        else
            log_error "No fallback feature available. Please add a 'no-torch' feature to Cargo.toml"
            exit 1
        fi
    fi
else
    # For native builds, use full PyTorch support
    log_info "Building AI service for native architecture with PyTorch..."
    cargo build --release 2>&1
fi

# Create bootstrap file
mkdir -p "target/lambda"
if [[ -f "target/${TARGET:-$(rustc -vV | grep host | cut -d' ' -f2)}/release/ai-service" ]]; then
    cp "target/${TARGET:-$(rustc -vV | grep host | cut -d' ' -f2)}/release/ai-service" "target/lambda/bootstrap"
    chmod +x "target/lambda/bootstrap"
    log_success "AI service successfully built"
else
    log_error "AI service binary not found after build"
    exit 1
fi 