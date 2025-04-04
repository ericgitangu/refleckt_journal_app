#!/bin/bash
# build-authorizer.sh: Special build script for authorizer with Ring/aws-lc-sys dependencies
set -eo pipefail

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$BACKEND_DIR/logs/build"
SCRIPT_NAME=$(basename "$0")
CURRENT_OPERATION="initializing"

# Source the utility functions
source "$SCRIPT_DIR/utils.sh"

# Source environment variables
source "$SCRIPT_DIR/set_env.sh"

# Create log directory
mkdir -p "$LOG_DIR"

# Signal names for better error reporting
get_signal_name() {
    local signal_number=$1
    case $signal_number in
        1) echo "SIGHUP (terminal closed)" ;;
        2) echo "SIGINT (interrupted - likely Ctrl+C)" ;;
        3) echo "SIGQUIT (quit signal)" ;;
        6) echo "SIGABRT (aborted)" ;;
        9) echo "SIGKILL (killed)" ;;
        15) echo "SIGTERM (terminated)" ;;
        130) echo "SIGINT (interrupted - likely Ctrl+C)" ;;
        131) echo "SIGQUIT (quit with core dump)" ;;
        137) echo "SIGKILL (killed)" ;;
        143) echo "SIGTERM (terminated)" ;;
        *) echo "signal $signal_number" ;;
    esac
}

# Enhanced trap handler for more verbose error reporting
handle_error() {
    local line=$1
    local status=$2
    local command=$3
    local func=${FUNCNAME[1]:-main}
    local error_log="$LOG_DIR/authorizer-build-error.log"
    
    # Capture the call stack for more context
    local stack=""
    local frame=0
    local i
    stack="Call stack:\n"
    while caller $frame >/dev/null 2>&1; do
        i=($(caller $frame))
        stack+="  #$frame: ${i[1]} (${i[2]}) at line ${i[0]}\n"
        ((frame++))
    done
    
    # Get signal name for better context if this was a signal
    local status_info
    if [ $status -gt 128 ]; then
        status_info="$(get_signal_name $status)"
    else
        status_info="code $status"
    fi
    
    log_error "Authorizer build failed with $status_info at line $line in $func"
    log_error "Current operation: $CURRENT_OPERATION"
    log_error "Command that failed: $command"
    log_error "See detailed logs in $error_log"
    
    # Create a detailed error summary with environment information
    {
        echo "=== AUTHORIZER BUILD FAILURE SUMMARY ==="
        echo "Timestamp: $(date)"
        echo "Script: $SCRIPT_NAME"
        echo "Failed operation: $CURRENT_OPERATION"
        echo "Failed function: $func"
        echo "Failed at line: $line"
        echo "Exit status: $status ($status_info)"
        echo "Command: $command"
        echo -e "$stack"
        echo "=== BUILD ENVIRONMENT ==="
        echo "TARGET: $TARGET"
        echo "RUST_VERSION: $RUST_VERSION"
        echo "OPENSSL_DIR: $OPENSSL_DIR"
        echo "Using AR: $AR"
        echo "PATH: $PATH"
        echo "Working directory: $(pwd)"
        
        echo "=== DEBUGGING INFORMATION ==="
        echo "Last 20 lines of build log (if available):"
        if [ -f "$LOG_DIR/authorizer-build.log" ]; then
            tail -n 20 "$LOG_DIR/authorizer-build.log"
        else
            echo "No build log found. The failure may have occurred before logging started."
        fi
        
        # Add pipeline status info if this failed in a pipe
        echo -e "\n=== PIPELINE STATUS ==="
        echo "If this error occurred in a pipeline, here's the relevant information:"
        echo "PIPESTATUS (if available): ${PIPESTATUS[*]}"
        echo "This shows the exit status of each command in the most recent pipeline."
        
        echo "==========================="
    } > "$error_log"
    
    # Final message with recovery advice
    log_info "Build failed. For detailed information, review: $error_log"
    
    exit $status
}

# Set up trap to catch failures with enhanced error reporting
trap 'handle_error ${LINENO} $? "$BASH_COMMAND"' ERR

# Also catch specific signals for better reporting
trap 'echo "Build interrupted by user (SIGINT)"; exit 130' INT
trap 'echo "Build terminated (SIGTERM)"; exit 143' TERM

# Helper function to handle piped commands safely
run_piped_command() {
    local log_file="$1"
    local description="$2"
    local command="$3"
    
    log_info "Running: $description"
    eval "$command" 2>&1 | tee "$log_file"
    local pipe_status=("${PIPESTATUS[@]}")
    
    # Check the status of the first command in the pipe (the actual build command)
    if [ ${pipe_status[0]} -ne 0 ]; then
        log_error "$description failed with status ${pipe_status[0]}"
        return ${pipe_status[0]}
    fi
    
    # Check if tee failed (very unusual, but could happen)
    if [ ${pipe_status[1]} -ne 0 ]; then
        log_warning "Logging command (tee) failed with status ${pipe_status[1]}"
        # We don't exit here because the main command succeeded
    fi
    
    return 0
}

# Build common library first
build_common() {
    CURRENT_OPERATION="building common library"
    log_info "Building common library..."
    
    cd "$BACKEND_DIR/common"
    
    # Check if Makefile exists and use it
    if [ -f "Makefile" ]; then
        log_info "Using Makefile to build common library"
        run_piped_command "$LOG_DIR/common-build.log" "Common library build with make" "make build-musl TARGET=\"$TARGET\""
    else
        # Build with cargo
        log_info "Building common library with cargo"
        run_piped_command "$LOG_DIR/common-build.log" "Common library build with cargo" "cargo build --release --target \"$TARGET\" --features=\"openssl,jwt-auth\""
    fi
    
    if [ $? -eq 0 ]; then
        log_success "Common library built successfully"
    else
        log_error "Failed to build common library"
        cat "$LOG_DIR/common-build.log"
        exit 1
    fi
    
    cd "$BACKEND_DIR"
}

# Build authorizer with special handling for aws-lc-sys
build_authorizer() {
    CURRENT_OPERATION="building authorizer service with special handling for ring/aws-lc-sys"
    log_info "Building authorizer service with special handling for ring/aws-lc-sys"
    log_info "Target: $TARGET"
    
    cd "$BACKEND_DIR/authorizer"
    
    # Check if Makefile exists and use it
    if [ -f "Makefile" ]; then
        CURRENT_OPERATION="building authorizer using Makefile"
        log_info "Using Makefile to build authorizer"
        run_piped_command "$LOG_DIR/authorizer-build.log" "Authorizer build with make" "make build-musl TARGET=\"$TARGET\""
    else
        # Build with cargo directly with special flags
        CURRENT_OPERATION="building authorizer using cargo directly"
        log_info "Building authorizer with cargo directly"
        run_piped_command "$LOG_DIR/authorizer-build.log" "Authorizer build with cargo" "cargo build --release --target \"$TARGET\" --no-default-features"
        
        # Check return code explicitly before continuing
        if [ $? -ne 0 ]; then
            log_error "Cargo build failed for authorizer"
            exit 1
        fi
        
        # Create bootstrap file for Lambda
        CURRENT_OPERATION="creating Lambda bootstrap file"
        log_info "Creating Lambda bootstrap file"
        mkdir -p "target/lambda"
        
        if [ -f "target/${TARGET}/release/journal-authorizer" ]; then
            cp "target/${TARGET}/release/journal-authorizer" "target/lambda/bootstrap"
            log_info "Copied journal-authorizer to bootstrap"
        elif [ -f "target/${TARGET}/release/authorizer" ]; then
            cp "target/${TARGET}/release/authorizer" "target/lambda/bootstrap"
            log_info "Copied authorizer to bootstrap"
        else
            log_error "Could not find built authorizer binary in expected locations"
            ls -la "target/${TARGET}/release/" || echo "Failed to list release directory"
            exit 1
        fi
        
        chmod +x "target/lambda/bootstrap"
        log_info "Made bootstrap executable"
    fi
    
    # Verify the bootstrap file exists and is executable
    if [ -f "target/lambda/bootstrap" ] && [ -x "target/lambda/bootstrap" ]; then
        log_success "Authorizer service built successfully"
    else
        log_error "Failed to build authorizer service: bootstrap file not found or not executable"
        exit 1
    fi
}

# Main build process
main() {
    CURRENT_OPERATION="starting build process"
    log_info "Starting build process for authorizer service"
    
    # Verify environment variables are set
    CURRENT_OPERATION="verifying environment variables"
    log_info "Verifying environment variables"
    if [ -z "$TARGET" ]; then
        log_error "TARGET environment variable is not set"
        exit 1
    fi
    
    if [ -z "$RUST_VERSION" ]; then
        log_error "RUST_VERSION environment variable is not set"
        exit 1
    fi
    
    log_info "Using RUST_VERSION=$RUST_VERSION"
    log_info "Using TARGET=$TARGET"
    log_info "Using OPENSSL_DIR=$OPENSSL_DIR"
    log_info "Using AR=$AR"
    
    # Build common library first
    build_common
    
    # Build authorizer
    build_authorizer
    
    log_success "✅ Authorizer build completed successfully!"
}

main "$@" 