#!/bin/bash
# Cross-compilation build script for Rust Lambda services
set -eo pipefail

# Handle script parameters
SERVICE_NAME=$1
OUTPUT_DIR=${2:-"./target/lambda"}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$BACKEND_DIR/logs/build"
SCRIPT_NAME=$(basename "$0")
CURRENT_OPERATION="initializing"

# Source utils.sh for logging functions
source "$SCRIPT_DIR/utils.sh"

# Source environment variables from set_env.sh
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
    local error_log="$LOG_DIR/${SERVICE_NAME}-error.log"
    
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
    
    log_error "Cross-build failed with $status_info at line $line in function $func"
    log_error "Current operation: $CURRENT_OPERATION"
    log_error "Service: $SERVICE_NAME"
    log_error "Command that failed: $command"
    log_error "See detailed logs in $error_log"
    
    # Create a detailed error summary with environment information
    {
        echo "=== CROSS-BUILD FAILURE SUMMARY ==="
        echo "Timestamp: $(date)"
        echo "Script: $SCRIPT_NAME"
        echo "Service: $SERVICE_NAME"
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
        echo "AWS_LC_SYS_STATIC: $AWS_LC_SYS_STATIC"
        echo "AWS_LC_SYS_VENDORED: $AWS_LC_SYS_VENDORED"
        echo "AR: $AR"
        echo "PATH: $PATH"
        echo "Working directory: $(pwd)"
        
        echo "=== DEBUGGING INFORMATION ==="
        
        # Show build log if it exists
        local build_log="$LOG_DIR/${SERVICE_NAME}-build.log"
        if [ -f "$build_log" ]; then
            echo -e "\n=== LAST 20 LINES OF BUILD LOG ==="
            tail -n 20 "$build_log"
        else
            echo "No build log found at $build_log"
            
            # Try to find any log file related to this service
            echo "Searching for any logs related to $SERVICE_NAME..."
            find "$LOG_DIR" -name "*${SERVICE_NAME}*" -type f -exec ls -la {} \;
        fi
        
        # Add pipeline status info if this failed in a pipe
        echo -e "\n=== PIPELINE STATUS ==="
        echo "If this error occurred in a pipeline, here's the relevant information:"
        echo "PIPESTATUS (if available): ${PIPESTATUS[*]}"
        echo "This shows the exit status of each command in the most recent pipeline."
        
        # Try to list relevant files to help with debugging
        echo -e "\n=== RELEVANT FILES ==="
        echo "Service directory content:"
        ls -la "$BACKEND_DIR/$SERVICE_NAME" 2>/dev/null || echo "Cannot access service directory"
        
        echo -e "\nCargo.toml content (if exists):"
        cat "$BACKEND_DIR/$SERVICE_NAME/Cargo.toml" 2>/dev/null || echo "Cannot read Cargo.toml"
        
        echo "==========================="
    } > "$error_log"
    
    # Print hint about how to debug further
    log_info "For more details, run: cat $error_log"
    
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

# Check parameters
if [ -z "$SERVICE_NAME" ]; then
    log_error "Service name is required."
    echo "Usage: $0 <service-name> [output-dir]"
    exit 1
fi

CURRENT_OPERATION="validating service directory"
log_info "Cross-compiling $SERVICE_NAME for Lambda with target $TARGET"

SERVICE_DIR="$BACKEND_DIR/$SERVICE_NAME"

# Check if service directory exists
if [ ! -d "$SERVICE_DIR" ]; then
    log_error "Service directory not found: $SERVICE_DIR"
    exit 1
fi

# Check if Cargo.toml exists
if [ ! -f "$SERVICE_DIR/Cargo.toml" ]; then
    log_error "Cargo.toml not found in $SERVICE_DIR"
    exit 1
fi

# Create service-specific build log file
BUILD_LOG="$LOG_DIR/${SERVICE_NAME}-build.log"
mkdir -p "$(dirname "$BUILD_LOG")"

# Handle special cases based on service name
if [ "$SERVICE_NAME" = "authorizer" ]; then
    CURRENT_OPERATION="building authorizer with special handling"
    log_info "Using special handling for authorizer service due to ring/aws-lc-sys dependencies"
    
    # Use specialized script if available
    if [ -f "$SCRIPT_DIR/build-authorizer.sh" ]; then
        log_info "Using specialized build-authorizer.sh script..."
        run_piped_command "$BUILD_LOG" "Build authorizer with specialized script" "bash $SCRIPT_DIR/build-authorizer.sh"
        if [ $? -eq 0 ]; then
            log_success "Authorizer built successfully with specialized script"
            exit 0
        else
            log_error "Failed to build authorizer with specialized script"
            exit 1
        fi
    fi
    
    log_info "No specialized script found, using built-in special handling for authorizer"
    
    # Special flags for authorizer if specialized script not available
    cd "$SERVICE_DIR"
    run_piped_command "$BUILD_LOG" "Build authorizer with no-default-features" "cargo build --release --target \"$TARGET\" --no-default-features"
    
    # Create output directory if it doesn't exist
    mkdir -p "$OUTPUT_DIR"
    
    # Copy binary to output directory with proper error checking
    if [ -f "target/${TARGET}/release/journal-${SERVICE_NAME}" ]; then
        cp "target/${TARGET}/release/journal-${SERVICE_NAME}" "$OUTPUT_DIR/bootstrap"
        log_info "Copied journal-${SERVICE_NAME} to bootstrap"
    elif [ -f "target/${TARGET}/release/${SERVICE_NAME}" ]; then
        cp "target/${TARGET}/release/${SERVICE_NAME}" "$OUTPUT_DIR/bootstrap"
        log_info "Copied ${SERVICE_NAME} to bootstrap"
    else
        log_error "Could not find built authorizer binary in expected locations"
        ls -la "target/${TARGET}/release/" || echo "Failed to list release directory"
        exit 1
    fi
    
    chmod +x "$OUTPUT_DIR/bootstrap"
    log_success "$SERVICE_NAME successfully built and packaged at $OUTPUT_DIR/bootstrap"
    exit 0
fi

# For non-authorizer services
cd "$SERVICE_DIR"

CURRENT_OPERATION="checking for aws-lc-sys/ring dependencies"
# Check if the service has aws-lc-sys or ring dependencies which need special handling
if grep -q "aws-lc-sys\|ring" Cargo.lock 2>/dev/null || grep -q "lambda_runtime" Cargo.toml 2>/dev/null; then
    CURRENT_OPERATION="building $SERVICE_NAME with aws-lc-sys/ring dependencies"
    log_info "Detected aws-lc-sys/ring dependencies, using special build approach"
    
    # Build with cargo directly and special environment variables
    log_info "Building $SERVICE_NAME with target $TARGET..."
    run_piped_command "$BUILD_LOG" "Build with cargo for $TARGET" "cargo build --target \"$TARGET\" --release"
    
    # Check the return code before continuing
    if [ $? -ne 0 ]; then
        log_error "Failed to build $SERVICE_NAME"
        exit 1
    fi
    
    # Create output directory if it doesn't exist
    mkdir -p "$OUTPUT_DIR"
    
    # Copy binary to output directory with proper error checking
    if [ -f "target/${TARGET}/release/journal-${SERVICE_NAME}" ]; then
        cp "target/${TARGET}/release/journal-${SERVICE_NAME}" "$OUTPUT_DIR/bootstrap"
        log_info "Copied journal-${SERVICE_NAME} to bootstrap"
    elif [ -f "target/${TARGET}/release/${SERVICE_NAME}" ]; then
        cp "target/${TARGET}/release/${SERVICE_NAME}" "$OUTPUT_DIR/bootstrap"
        log_info "Copied ${SERVICE_NAME} to bootstrap"
    else
        log_error "Could not find built binary in expected locations"
        ls -la "target/${TARGET}/release/" || echo "Failed to list release directory"
        exit 1
    fi
    
    chmod +x "$OUTPUT_DIR/bootstrap"
    log_info "Made bootstrap executable"
else
    CURRENT_OPERATION="building $SERVICE_NAME with cargo-lambda"
    log_info "Building $SERVICE_NAME with cargo-lambda..."
    
    # Create output directory if it doesn't exist
    mkdir -p "$OUTPUT_DIR"
    
    # Build with cargo-lambda
    if command -v cargo-lambda &>/dev/null; then
        run_piped_command "$BUILD_LOG" "Build with cargo-lambda" "cargo lambda build --release --target \"$TARGET\" --lambda-runtime \"$LAMBDA_RUNTIME\" --output-format binary"
        
        # Copy binary to output directory if cargo-lambda didn't already
        if [ ! -f "$OUTPUT_DIR/bootstrap" ]; then
            log_info "Looking for binary to copy to bootstrap..."
            # Try various possible binary locations
            if [ -f "target/lambda/release/${SERVICE_NAME}" ]; then
                cp "target/lambda/release/${SERVICE_NAME}" "$OUTPUT_DIR/bootstrap"
                log_info "Copied from target/lambda/release/${SERVICE_NAME}"
            elif [ -f "target/lambda/${SERVICE_NAME}" ]; then
                cp "target/lambda/${SERVICE_NAME}" "$OUTPUT_DIR/bootstrap"
                log_info "Copied from target/lambda/${SERVICE_NAME}"
            elif [ -f "target/${TARGET}/release/${SERVICE_NAME}" ]; then
                cp "target/${TARGET}/release/${SERVICE_NAME}" "$OUTPUT_DIR/bootstrap"
                log_info "Copied from target/${TARGET}/release/${SERVICE_NAME}"
            elif [ -f "target/${TARGET}/release/journal-${SERVICE_NAME}" ]; then
                cp "target/${TARGET}/release/journal-${SERVICE_NAME}" "$OUTPUT_DIR/bootstrap"
                log_info "Copied from target/${TARGET}/release/journal-${SERVICE_NAME}"
            else
                log_error "Could not find built binary in any expected location"
                find "target" -name "*${SERVICE_NAME}*" -type f -executable || echo "No executable files found"
                exit 1
            fi
            
            chmod +x "$OUTPUT_DIR/bootstrap"
            log_info "Made bootstrap executable"
        else
            log_info "cargo-lambda already created bootstrap file"
        fi
    else
        log_warning "cargo-lambda not found, falling back to standard cargo build"
        run_piped_command "$BUILD_LOG" "Build with standard cargo" "cargo build --release --target \"$TARGET\""
        
        # Check for binary and copy to bootstrap with proper error handling
        if [ -f "target/${TARGET}/release/journal-${SERVICE_NAME}" ]; then
            cp "target/${TARGET}/release/journal-${SERVICE_NAME}" "$OUTPUT_DIR/bootstrap"
            log_info "Copied from journal-${SERVICE_NAME}"
        elif [ -f "target/${TARGET}/release/${SERVICE_NAME}" ]; then
            cp "target/${TARGET}/release/${SERVICE_NAME}" "$OUTPUT_DIR/bootstrap"
            log_info "Copied from ${SERVICE_NAME}"
        else
            log_error "Could not find built binary in expected locations"
            find "target/${TARGET}/release" -type f -executable || echo "No executable files found in release directory"
            exit 1
        fi
        
        chmod +x "$OUTPUT_DIR/bootstrap"
        log_info "Made bootstrap executable"
    fi
fi

CURRENT_OPERATION="verifying build output"
# Verify the Lambda bootstrap file exists
if [ -f "$OUTPUT_DIR/bootstrap" ]; then
    if [ -x "$OUTPUT_DIR/bootstrap" ]; then
        log_success "$SERVICE_NAME successfully built and packaged at $OUTPUT_DIR/bootstrap"
    else
        log_warning "Bootstrap file exists but is not executable. Setting permissions..."
        chmod +x "$OUTPUT_DIR/bootstrap"
        if [ -x "$OUTPUT_DIR/bootstrap" ]; then
            log_success "Permissions fixed. $SERVICE_NAME successfully built and packaged."
        else
            log_error "Failed to set executable permissions on bootstrap file"
            exit 1
        fi
    fi
else
    log_error "Failed to create Lambda bootstrap file for $SERVICE_NAME. Output directory contains:"
    ls -la "$OUTPUT_DIR" || echo "Failed to list output directory contents"
    exit 1
fi

exit 0 