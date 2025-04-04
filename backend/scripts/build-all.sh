#!/bin/bash
# Script to build all Lambda functions in the project

set -eo pipefail

# Import common functions
source "$(dirname "$0")/common.sh"

# Get backend directory from common.sh
BACKEND_DIR=${BACKEND_DIR:-$(cd "$(dirname "$0")/.." && pwd)}
SCRIPTS_DIR="$BACKEND_DIR/scripts"

# Set up log directory within the logs structure
LOG_DIR="$BACKEND_DIR/logs/build"

# Create log directory
mkdir -p "$LOG_DIR"

# Trap handler for unexpected failures
handle_error() {
    local line=$1
    local status=$2
    local command=$3
    
    log_error "Build failed with exit status $status at line $line: $command"
    log_error "See logs in $LOG_DIR for details"
    
    # Create a summary of the error in the log directory
    {
        echo "=== BUILD FAILURE SUMMARY ==="
        echo "Timestamp: $(date)"
        echo "Failed at line: $line"
        echo "Exit status: $status"
        echo "Command: $command"
        echo "==========================="
    } > "$LOG_DIR/build_error_summary.log"
    
    exit $status
}

# Set up trap to catch failures
trap 'handle_error ${LINENO} $? "$BASH_COMMAND"' ERR

# Parse arguments
TARGET=${TARGET:-"aarch64-unknown-linux-musl"}
LAMBDA_RUNTIME=${LAMBDA_RUNTIME:-"provided.al2023"}
SKIP_COMMON=${SKIP_COMMON:-false}
RUST_VERSION=${RUST_VERSION:-"1.85.0"}
DEBUG=${DEBUG:-false}
TARGET_SERVICES=()

# Script constants
REQUIRED_SPACE_MB=500
LOCAL_BIN="$BACKEND_DIR/.local/bin"
RUSTUP_TOOLCHAIN_BIN="$HOME/.rustup/toolchains/${RUST_VERSION}-x86_64-apple-darwin/bin"

# Create directories
mkdir -p "$LOCAL_BIN"

# Verify the Rust version is correct
verify_rust_version() {
    log_info "Verifying Rust version..."
    
    # Try using environment variable 
    export RUSTUP_TOOLCHAIN="${RUST_VERSION}"
    
    # Check if the right version is being used
    ACTUAL_VERSION=$("$RUSTUP_TOOLCHAIN_BIN/rustc" --version)
    if [[ "$ACTUAL_VERSION" == *"$RUST_VERSION"* ]]; then
        log_success "Confirmed using Rust $RUST_VERSION: $ACTUAL_VERSION"
    else
        log_error "Wrong Rust version detected: $ACTUAL_VERSION (expected $RUST_VERSION)"
        log_error "Please run ./scripts/fix-rust-version.sh first"
        exit 1
    fi
}

# Clean previous builds
clean_previous_builds() {
    print_banner "CLEANING PREVIOUS BUILDS"
    
    log_info "Cleaning build logs..."
    rm -rf "$LOG_DIR"/*
    
    log_info "Cleaning target directories..."
    # Clean common
    if [ -d "$BACKEND_DIR/common/target" ]; then
        log_info "Cleaning common/target..."
        rm -rf "$BACKEND_DIR/common/target" || true
    fi
    
    # Clean services
    local services=(
        "authorizer"
        "entry-service"
        "analytics-service"
        "ai-service" 
        "settings-service"
        "prompts-service"
    )
    
    for service in "${services[@]}"; do
        if [ -d "$BACKEND_DIR/$service/target" ]; then
            log_info "Cleaning $service/target..."
            rm -rf "$BACKEND_DIR/$service/target" || true
        fi
    done
    
    log_success "All previous builds cleaned."
}

# Set up environment without sudo
setup_env_without_sudo() {
    print_banner "SETTING UP BUILD ENVIRONMENT"
    
    # Add local bin to PATH
    if [[ ":$PATH:" != *":$LOCAL_BIN:"* ]]; then
        export PATH="$LOCAL_BIN:$PATH"
        log_info "Added $LOCAL_BIN to PATH"
    fi
    
    # Add rustup bin to PATH
    if [[ ":$PATH:" != *":$RUSTUP_TOOLCHAIN_BIN:"* ]]; then
        export PATH="$RUSTUP_TOOLCHAIN_BIN:$PATH"
        log_info "Added $RUSTUP_TOOLCHAIN_BIN to PATH"
    fi
    
    # Make sure we're using the right Rust version
    log_info "Ensuring Rust $RUST_VERSION is installed and active..."
    rustup install "$RUST_VERSION" --force
    
    # Install cargo-lambda locally if needed
    if ! command -v cargo-lambda &> /dev/null; then
        log_info "Installing cargo-lambda to $LOCAL_BIN..."
        "$RUSTUP_TOOLCHAIN_BIN/cargo" install cargo-lambda --root "$BACKEND_DIR/.local"
        if [ $? -ne 0 ]; then
            log_error "Failed to install cargo-lambda locally. Check permissions."
            log_info "You can try installing it manually with: cargo install cargo-lambda"
            exit 1
        fi
    fi
    
    # Set up target architecture
    TARGET=${TARGET:-"aarch64-unknown-linux-musl"}
    LAMBDA_RUNTIME=${LAMBDA_RUNTIME:-"provided.al2023"}
    
    # Add the target to rustup (this doesn't require sudo)
    rustup target add --toolchain "$RUST_VERSION" "$TARGET"
    
    # Verify the Rust version
    verify_rust_version
    
    log_success "Build environment set up without sudo."
}

# Build services function
build_services() {
    print_banner "BUILDING ALL SERVICES"
    
    # Check for available space
    check_available_space "$REQUIRED_SPACE_MB"
    
    # Build common library first if it exists
    if [ -d "$BACKEND_DIR/common" ]; then
        log_info "Building common library with Rust $RUST_VERSION..."
        (cd "$BACKEND_DIR/common" && RUSTUP_TOOLCHAIN="$RUST_VERSION" "$RUSTUP_TOOLCHAIN_BIN/cargo" build --release --target "$TARGET") > "$LOG_DIR/common-build.log" 2>&1
        
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
        log_info "Building $service with cargo-lambda and Rust $RUST_VERSION..."
        
        # Skip if service directory doesn't exist
        if [ ! -d "$BACKEND_DIR/$service" ]; then
            log_warning "Service directory $service not found, skipping."
            continue
        fi
        
        # Build using Makefile if available
        if [ -f "$BACKEND_DIR/$service/Makefile" ]; then
            log_info "Using Makefile to build $service..."
            (cd "$BACKEND_DIR/$service" && RUSTUP_TOOLCHAIN="$RUST_VERSION" PATH="$RUSTUP_TOOLCHAIN_BIN:$PATH" make build-musl TARGET="$TARGET") > "$LOG_DIR/$service-build.log" 2>&1
        else
            # Build with cargo-lambda
            log_info "No Makefile found, using cargo-lambda to build $service..."
            (cd "$BACKEND_DIR/$service" && RUSTUP_TOOLCHAIN="$RUST_VERSION" "$RUSTUP_TOOLCHAIN_BIN/cargo" lambda build --release --target "$TARGET" --lambda-runtime "$LAMBDA_RUNTIME") > "$LOG_DIR/$service-build.log" 2>&1
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
    
    # Clean previous builds
    clean_previous_builds
    
    # Set up environment without sudo
    setup_env_without_sudo
    
    # Build all services
    build_services
    
    log_success "Build process complete."
    log_info "Check build logs in $LOG_DIR for details."
    log_info "To test endpoints, run: ./scripts/test-endpoints.sh"
}

main "$@"