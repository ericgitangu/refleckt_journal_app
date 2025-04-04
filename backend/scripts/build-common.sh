#!/bin/bash
# Script to build the common library with proper cross-compilation settings
set -eo pipefail

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
COMMON_DIR="$BACKEND_DIR/common"
LOG_DIR="$BACKEND_DIR/logs/build"

# Source utils.sh for logging functions
source "$SCRIPT_DIR/utils.sh"

# Source environment variables from set_env.sh
source "$SCRIPT_DIR/set_env.sh"

# Create log directory
mkdir -p "$LOG_DIR"

# Trap handler for unexpected failures
handle_error() {
    local line=$1
    local status=$2
    local command=$3
    
    log_error "Common library build failed with exit status $status at line $line: $command"
    log_error "See logs in $LOG_DIR/common-build-error.log for details"
    
    # Create a summary of the error in the log directory
    {
        echo "=== COMMON LIBRARY BUILD FAILURE SUMMARY ==="
        echo "Timestamp: $(date)"
        echo "Failed at line: $line"
        echo "Exit status: $status"
        echo "Command: $command"
        echo "==========================="
    } > "$LOG_DIR/common-build-error.log"
    
    exit $status
}

# Set up trap to catch failures
trap 'handle_error ${LINENO} $? "$BASH_COMMAND"' ERR

log_info "Building common library with target $TARGET"

# Check if common directory exists
if [ ! -d "$COMMON_DIR" ]; then
    log_error "Common directory not found: $COMMON_DIR"
    exit 1
fi

# Check if Cargo.toml exists
if [ ! -f "$COMMON_DIR/Cargo.toml" ]; then
    log_error "Cargo.toml not found in $COMMON_DIR"
    exit 1
fi

# Change to common directory
cd "$COMMON_DIR"

# Check if Makefile exists
if [ -f "Makefile" ]; then
    log_info "Using Makefile to build common library"
    make build-musl TARGET="$TARGET" 2>&1 | tee "$LOG_DIR/common-build.log"
else
    # Build with cargo
    log_info "Building common library with cargo"
    cargo build --release --target "$TARGET" 2>&1 | tee "$LOG_DIR/common-build.log"
fi

if [ ${PIPESTATUS[0]} -ne 0 ]; then
    log_error "Common library build failed. Check $LOG_DIR/common-build.log for details."
    cat "$LOG_DIR/common-build.log"
    exit 1
fi

log_success "Common library built successfully"
exit 0 