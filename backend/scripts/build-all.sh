#!/bin/bash
# Script to build all Lambda functions in the project

set -eo pipefail

# Script constants
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
SCRIPTS_DIR="$BACKEND_DIR/scripts"

# Source common functions
source "$SCRIPTS_DIR/common.sh"

# Source environment variables from set_env.sh
source "$SCRIPTS_DIR/set_env.sh"

# Ensure LOG_DIR exists with proper error handling
if [ -z "$LOG_DIR" ]; then
    LOG_DIR="$BACKEND_DIR/logs/build"
    log_warning "LOG_DIR was not set, defaulting to $LOG_DIR"
fi

# Create log directory with explicit error checking
log_info "Creating log directory at: $LOG_DIR"
if ! mkdir -p "$LOG_DIR"; then
    log_error "Failed to create log directory: $LOG_DIR"
    log_error "Check file permissions and path validity"
    exit 1
fi

# Clean logs if needed
if [ -d "$LOG_DIR" ]; then
    rm -rf "$LOG_DIR"/*
fi

# Trap handler for unexpected failures
handle_error() {
    local line=$1
    local status=$2
    local command=$3
    local func=${FUNCNAME[1]:-main}
    local error_log="$LOG_DIR/build_error_summary.log"
    
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
    
    log_error "Build failed with exit status $status at line $line in function $func"
    log_error "Current operation: ${CURRENT_OPERATION:-unknown}"
    log_error "Command that failed: $command"
    log_error "See detailed logs in $error_log"
    
    # Create a detailed error summary with environment information
    {
        echo "=== BUILD FAILURE SUMMARY ==="
        echo "Timestamp: $(date)"
        echo "Script: $(basename "$0")"
        echo "Failed operation: ${CURRENT_OPERATION:-unknown}"
        echo "Failed function: $func"
        echo "Failed at line: $line"
        echo "Exit status: $status"
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
        echo "=== LOG FILES ===" 
        echo "Recent error logs:"
        find "$LOG_DIR" -name "*error*.log" -mtime -1 | xargs ls -lh
        
        # If there's a specific service being built, show its log
        if [[ -n "${CURRENT_SERVICE}" && -f "$LOG_DIR/${CURRENT_SERVICE}-build.log" ]]; then
            echo -e "\n=== LAST 20 LINES OF ${CURRENT_SERVICE} BUILD LOG ==="
            tail -n 20 "$LOG_DIR/${CURRENT_SERVICE}-build.log"
        fi
        
        echo "==========================="
    } > "$error_log"
    
    exit $status
}

# Set up trap to catch failures
trap 'handle_error ${LINENO} $? "$BASH_COMMAND"' ERR

# Parse arguments
# Now using variables from set_env.sh with defaults
TARGET=${TARGET:-"aarch64-unknown-linux-musl"}
LAMBDA_RUNTIME=${LAMBDA_RUNTIME:-"provided.al2023"}
SKIP_COMMON=${SKIP_COMMON:-false}
RUST_VERSION=${RUST_VERSION:-"1.85.0"}
DEBUG=${DEBUG:-false}
TARGET_SERVICES=()

# Script constants
REQUIRED_SPACE_MB=500

# Create local bin dir with proper error handling
if [ -z "$LOCAL_BIN" ]; then
    LOCAL_BIN="$BACKEND_DIR/.local/bin"
    log_warning "LOCAL_BIN was not set, defaulting to $LOCAL_BIN"
fi

# Ensure LOCAL_BIN directory exists with proper permissions
log_info "Creating local bin directory at: $LOCAL_BIN"
if ! mkdir -p "$LOCAL_BIN"; then
    log_error "Failed to create local bin directory: $LOCAL_BIN"
    log_error "Check file permissions and path validity"
    exit 1
fi

# Set up lightweight llvm-ar without installing developer tools
setup_llvm_ar() {
    log_info "Setting up lightweight ar environment for cross-compilation..."
    
    # Check if we're on macOS
    if [ "$(uname)" = "Darwin" ]; then
        log_info "macOS detected, using system ar instead of llvm-ar"
        
        # Check if system ar exists
        if [ -f "/usr/bin/ar" ]; then
            log_info "Found system ar at /usr/bin/ar"
            
            # Set environment variables rather than create symlinks
            export AR="/usr/bin/ar"
            export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_MUSL_AR="/usr/bin/ar"
            
            log_success "Environment variables set correctly"
            log_info "No developer tools or symlinks required!"
        else
            log_warning "System ar not found at /usr/bin/ar - this is unusual for macOS"
            log_error "Your system may be missing basic utilities"
            exit 1
        fi
    else
        log_info "Non-macOS system detected"
        
        # Check if ar is available
        if command -v ar &> /dev/null; then
            AR_PATH=$(command -v ar)
            log_info "Found system ar at $AR_PATH"
            export AR="$AR_PATH"
            export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_MUSL_AR="$AR_PATH"
            log_success "Environment variables set correctly"
        else
            log_error "System ar not found in PATH"
            log_error "Please install binutils package for your system"
            exit 1
        fi
    fi
}

# Verify llvm-ar is working correctly
verify_llvm_ar() {
    log_info "Verifying llvm-ar setup..."
    
    # Add local bin to PATH if not already
    export PATH="$LOCAL_BIN:$PATH"
    
    # Check if llvm-ar is in PATH
    if command -v llvm-ar &> /dev/null; then
        log_success "llvm-ar found in PATH"
        
        # Create a simple test archive to verify functionality
        local test_dir=$(mktemp -d)
        local test_file="$test_dir/test.txt"
        local test_archive="$test_dir/test.a"
        
        echo "test content" > "$test_file"
        
        # Try to create an archive
        if llvm-ar rcs "$test_archive" "$test_file" 2>/dev/null; then
            log_success "llvm-ar successfully created test archive"
            rm -rf "$test_dir"
        else
            log_warning "llvm-ar failed to create test archive, but we'll continue anyway"
            log_info "The environment variables should still allow cargo to build correctly"
        fi
    else
        log_error "llvm-ar not found in PATH after setup"
        log_info "Setting AR environment variables as fallback"
        
        # Set fallback environment variables
        export AR="/usr/bin/ar"
        export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_MUSL_AR="/usr/bin/ar"
    fi
}

# Verify the Rust version is correct
verify_rust_version() {
    log_info "Verifying Rust version..."
    
    # Already set in set_env.sh
    
    # Check if the right version is being used
    ACTUAL_VERSION=$(rustc --version)
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
    
    # Set up lightweight llvm-ar
    setup_llvm_ar
    
    # Make sure we're using the right Rust version
    log_info "Ensuring Rust $RUST_VERSION is installed and active..."
    rustup install "$RUST_VERSION" --force
    
    # Install cargo-lambda locally if needed
    if ! command -v cargo-lambda &> /dev/null; then
        log_info "Installing cargo-lambda to $LOCAL_BIN..."
        cargo install cargo-lambda --root "$BACKEND_DIR/.local"
        if [ $? -ne 0 ]; then
            log_error "Failed to install cargo-lambda locally. Check permissions."
            log_info "You can try installing it manually with: cargo install cargo-lambda"
            exit 1
        fi
    fi
    
    # Add the target to rustup (this doesn't require sudo)
    rustup target add --toolchain "$RUST_VERSION" "$TARGET"
    
    # Verify the Rust version
    verify_rust_version
    
    log_success "Build environment set up without sudo."
}

# Setup root-level cargo config
setup_cargo_config() {
    log_info "Setting up root-level cargo configuration..."
    
    # Create .cargo directory at the project root if it doesn't exist
    mkdir -p "$BACKEND_DIR/.cargo"
    
    # Check if config.toml already exists
    if [ -f "$BACKEND_DIR/.cargo/config.toml" ]; then
        log_info "Root cargo config.toml already exists"
        return 0
    fi
    
    # Write the cargo config with the detected OPENSSL_DIR
    cat > "$BACKEND_DIR/.cargo/config.toml" << EOF
[build]
rustflags = ["-C", "link-arg=-s"]

[target.aarch64-unknown-linux-musl]
linker = "aarch64-linux-musl-gcc"
rustflags = [
  "-C", "link-self-contained=yes"
]

[env]
OPENSSL_STATIC = "1"
OPENSSL_DIR = "${OPENSSL_DIR}"
AWS_LC_SYS_STATIC = "1" 
AWS_LC_SYS_VENDORED = "1"
RUSTSEC_IGNORE = "1"
OPENSSL_NO_VENDOR = "1"
EOF
    
    log_success "Root-level cargo config created with OPENSSL_DIR=${OPENSSL_DIR}"
}

# Verify patch section in common/Cargo.toml
verify_patch_section() {
    log_info "Checking patch section in common/Cargo.toml..."
    
    local common_cargo="$BACKEND_DIR/common/Cargo.toml"
    
    if [ ! -f "$common_cargo" ]; then
        log_warning "common/Cargo.toml not found, skipping patch verification"
        return 0
    fi
    
    # With our environment variable approach, patches are no longer needed
    # Check if there's a patch section (we want it removed)
    if grep -q '\[patch.crates-io\]' "$common_cargo"; then
        log_warning "Patch section found in common/Cargo.toml - no longer needed with environment variables"
        log_info "Consider removing the [patch.crates-io] section as it may cause compilation issues"
        log_info "The environment variables in set_env.sh handle cross-compilation properly now"
    else
        log_success "No patch section found in common/Cargo.toml - good!"
    fi
}

# Check if a service is already built
is_service_built() {
    local service=$1
    
    # Check if the bootstrap file exists for the service
    if [ -f "$BACKEND_DIR/$service/target/lambda/bootstrap" ]; then
        # Check if the file is executable
        if [ -x "$BACKEND_DIR/$service/target/lambda/bootstrap" ]; then
            log_info "Service $service is already built."
            return 0  # Service is built
        fi
    fi
    
    return 1  # Service needs to be built
}

# Get argument for skipping ai-service
SKIP_AI_SERVICE=false
for arg in "$@"; do
    case $arg in
        --skip-ai)
            SKIP_AI_SERVICE=true
            log_info "Skipping AI service build (torch-sys dependencies will not be compiled)"
            shift
            ;;
    esac
done

# Build services function
build_services() {
    CURRENT_OPERATION="building all services"
    print_banner "BUILDING ALL SERVICES"
    
    # Check for available space
    check_available_space "$REQUIRED_SPACE_MB"
    
    # Verify patch section in common/Cargo.toml
    verify_patch_section
    
    # Build common library first if it exists
    if [ -d "$BACKEND_DIR/common" ] && [ "$SKIP_COMMON" != "true" ]; then
        CURRENT_OPERATION="building common library"
        CURRENT_SERVICE="common"
        log_info "Building common library with Rust $RUST_VERSION..."
        (cd "$BACKEND_DIR/common" && cargo build --release --target "$TARGET") > "$LOG_DIR/common-build.log" 2>&1
        
        if [ $? -ne 0 ]; then
            log_error "Failed to build common library. See $LOG_DIR/common-build.log for details."
            cat "$LOG_DIR/common-build.log"
            exit 1
        fi
        
        log_success "Common library built successfully."
    elif [ "$SKIP_COMMON" = "true" ]; then
        log_info "Skipping common library build as requested."
    fi
    
    # List of services to build
    local services=(
        "authorizer"
        "entry-service"
        "analytics-service"
        "prompts-service"
        "settings-service"
    )
    
    # Add AI service if not skipped
    if [ "$SKIP_AI_SERVICE" != "true" ]; then
        services+=("ai-service")
    else
        log_info "Skipping AI service build as requested."
    fi
    
    # Build each service with cargo-lambda
    for service in "${services[@]}"; do
        # Skip if service directory doesn't exist
        if [ ! -d "$BACKEND_DIR/$service" ]; then
            log_warning "Service directory $service not found, skipping."
            continue
        fi
        
        # Check if service is already built
        if is_service_built "$service"; then
            log_info "Skipping $service as it's already built."
            continue
        }
        
        CURRENT_OPERATION="building service $service"
        CURRENT_SERVICE="$service"
        log_info "Building $service with Rust $RUST_VERSION..."
        
        # Special handling for authorizer service
        if [ "$service" = "authorizer" ]; then
            CURRENT_OPERATION="building authorizer service with special handling"
            log_info "Using special handling for authorizer service..."
            if [ -f "$SCRIPTS_DIR/build-authorizer.sh" ]; then
                bash "$SCRIPTS_DIR/build-authorizer.sh" > "$LOG_DIR/$service-build.log" 2>&1
            else
                # Direct build with no-default-features
                (cd "$BACKEND_DIR/$service" && cargo build --release --target "$TARGET" --no-default-features) > "$LOG_DIR/$service-build.log" 2>&1
                # Create bootstrap file
                mkdir -p "$BACKEND_DIR/$service/target/lambda"
                cp "$BACKEND_DIR/$service/target/${TARGET}/release/${service}" "$BACKEND_DIR/$service/target/lambda/bootstrap"
                chmod +x "$BACKEND_DIR/$service/target/lambda/bootstrap"
            fi
        else
            # Build using Makefile if available
            if [ -f "$BACKEND_DIR/$service/Makefile" ]; then
                CURRENT_OPERATION="building $service using Makefile"
                log_info "Using Makefile to build $service..."
                (cd "$BACKEND_DIR/$service" && make build-musl TARGET="$TARGET") > "$LOG_DIR/$service-build.log" 2>&1
            elif [ -f "$SCRIPTS_DIR/cross-build.sh" ]; then
                # Use cross-build.sh
                CURRENT_OPERATION="building $service using cross-build.sh"
                log_info "Using cross-build.sh to build $service..."
                bash "$SCRIPTS_DIR/cross-build.sh" "$service" > "$LOG_DIR/$service-build.log" 2>&1
            else
                # Build with cargo-lambda
                CURRENT_OPERATION="building $service using cargo-lambda"
                log_info "Using cargo-lambda to build $service..."
                (cd "$BACKEND_DIR/$service" && cargo lambda build --release --target "$TARGET" --lambda-runtime "$LAMBDA_RUNTIME") > "$LOG_DIR/$service-build.log" 2>&1
            fi
        fi
        
        if [ $? -ne 0 ]; then
            log_error "Failed to build $service. See $LOG_DIR/$service-build.log for details."
            cat "$LOG_DIR/$service-build.log"
            exit 1
        fi
        
        log_success "$service built successfully."
        
        # Verify Lambda package exists
        CURRENT_OPERATION="verifying lambda package for $service"
        if [ -d "$BACKEND_DIR/$service/target/lambda" ]; then
            log_info "Lambda package exists for $service"
        else
            log_warning "No Lambda package found for $service. Check build output."
        fi
    done
    
    log_success "All services built successfully."
}

# Print step-by-step guide
print_guide() {
    print_banner "CROSS-COMPILATION GUIDE"
    
    echo -e "\n🔍 \033[1;34mCross-Compilation Issues Fixed:\033[0m"
    echo -e "  1. \033[1;32mLightweight llvm-ar setup\033[0m - Using system ar instead of requiring full llvm installation"
    echo -e "  2. \033[1;32mEnvironment variables for Ring/aws-lc-sys\033[0m - Using AWS_LC_SYS_STATIC=1 and AWS_LC_SYS_VENDORED=1"
    echo -e "  3. \033[1;32mCentralized environment variables\033[0m - All build settings in set_env.sh"
    echo -e "  4. \033[1;32mRoot-level cargo config\033[0m - Single configuration for all services"
    echo -e "  5. \033[1;32mSpecial handling for authorizer\033[0m - Building with --no-default-features"
    echo -e "  6. \033[1;32mOptional AI dependencies\033[0m - Use --skip-ai to avoid compiling torch-sys"
    
    echo -e "\n📋 \033[1;34mTroubleshooting Checklist:\033[0m"
    echo -e "  • For Ring/aws-lc-sys issues, check that AWS_LC_SYS_STATIC=1 and AWS_LC_SYS_VENDORED=1 are set"
    echo -e "  • For OpenSSL errors, check that OPENSSL_DIR is correctly set in set_env.sh"
    echo -e "  • For linker errors, ensure musl-cross is installed: brew install FiloSottile/musl-cross/musl-cross"
    echo -e "  • For disk space errors with torch-sys, use: ./scripts/build-all.sh --skip-ai"
    echo -e "  • For authorizer issues, ensure it's built with --no-default-features"
    
    echo -e "\n🚀 \033[1;34mNext Steps:\033[0m"
    echo -e "  1. Use ./scripts/build-all.sh to build all services"
    echo -e "  2. Use ./scripts/build-all.sh --skip-ai to build without AI service"
    echo -e "  3. Use ./scripts/init.sh for full initialization including deployment"
    echo -e "  4. Run ./scripts/test-endpoints.sh to verify deployment"
    
    print_banner "HAPPY BUILDING!"
}

# Main function
main() {
    # Check for help parameter
    for arg in "$@"; do
        case $arg in
            --help|-h)
                print_usage
                exit 0
                ;;
        esac
    done
    
    print_banner "REFLEKT JOURNAL APP BUILD PROCESS"
    
    # Check prerequisites
    check_prerequisites
    
    # Clean previous builds
    clean_previous_builds
    
    # Set up environment without sudo
    setup_env_without_sudo
    
    # Setup root-level cargo config
    setup_cargo_config
    
    # Build all services
    build_services
    
    # Print cross-compilation guide
    print_guide
    
    log_success "Build process complete."
    log_info "Check build logs in $LOG_DIR for details."
    log_info "To test endpoints, run: ./scripts/test-endpoints.sh"
}

# Check prerequisites should include a more robust function to check musl-cross and OpenSSL
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check for AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check for jq
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed. Please install it first."
        exit 1
    fi
    
    # Check for cargo-lambda
    if ! command -v cargo-lambda &> /dev/null; then
        log_warning "cargo-lambda is not installed. Installing now..."
        cargo install cargo-lambda
        if [ $? -ne 0 ]; then
            log_error "Failed to install cargo-lambda. Please install it manually."
            log_info "You can try installing it manually with: cargo install cargo-lambda"
            exit 1
        fi
        log_success "cargo-lambda installed successfully."
    fi
    
    # Check that the target is available in rustup
    log_info "Checking Rust target: $TARGET"
    if ! rustup target list --installed | grep -q "$TARGET"; then
        log_warning "Target $TARGET not installed. Installing now..."
        rustup target add "$TARGET"
        if [ $? -ne 0 ]; then
            log_error "Failed to install target $TARGET."
            exit 1
        fi
        log_success "Target $TARGET installed successfully."
    else
        log_success "Target $TARGET is already installed."
    fi
    
    # Check for musl-cross in more flexible ways
    log_info "Checking for musl cross compiler..."
    
    # Look for the compiler directly instead of the package
    local gcc_path=""
    
    # First, try to find it directly in PATH
    if command -v aarch64-linux-musl-gcc &> /dev/null; then
        gcc_path=$(command -v aarch64-linux-musl-gcc)
        log_success "Found aarch64-linux-musl-gcc in PATH at: $gcc_path"
    else
        # If not in PATH, try to use brew to find the installation
        if command -v brew &> /dev/null; then
            log_info "Checking if musl-cross is installed with brew..."
            
            if brew list --formula | grep -q "musl-cross"; then
                log_info "musl-cross is installed with brew. Getting installation path..."
                
                local brew_prefix=$(brew --prefix musl-cross 2>/dev/null || echo "")
                if [ -n "$brew_prefix" ]; then
                    # Construct the expected path to the compiler
                    gcc_path="$brew_prefix/bin/aarch64-linux-musl-gcc"
                    
                    if [ -x "$gcc_path" ]; then
                        log_success "Found aarch64-linux-musl-gcc at: $gcc_path"
                        
                        # Add to PATH if not already included
                        if ! echo "$PATH" | grep -q "$(dirname "$gcc_path")"; then
                            export PATH="$(dirname "$gcc_path"):$PATH"
                            log_info "Added $(dirname "$gcc_path") to PATH"
                        fi
                        
                        # Set the compiler specifically for aarch64 target
                        export CC_aarch64_unknown_linux_musl="$gcc_path"
                        export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_MUSL_LINKER="$gcc_path"
                    else
                        log_warning "musl-cross is installed but aarch64-linux-musl-gcc not found at $gcc_path"
                        log_info "Checking if compiler was installed with --with-aarch64 flag..."
                        
                        # Try to install or reinstall with the correct flag
                        log_warning "You might need to reinstall musl-cross with: brew reinstall FiloSottile/musl-cross/musl-cross --with-aarch64"
                        
                        # Try legacy standard locations as a fallback
                        if [ -f "/usr/local/opt/musl-cross/bin/aarch64-linux-musl-gcc" ]; then
                            gcc_path="/usr/local/opt/musl-cross/bin/aarch64-linux-musl-gcc"
                            log_success "Found aarch64-linux-musl-gcc at legacy location: $gcc_path"
                            export PATH="/usr/local/opt/musl-cross/bin:$PATH"
                        elif [ -f "/opt/homebrew/opt/musl-cross/bin/aarch64-linux-musl-gcc" ]; then
                            gcc_path="/opt/homebrew/opt/musl-cross/bin/aarch64-linux-musl-gcc"
                            log_success "Found aarch64-linux-musl-gcc at legacy location: $gcc_path"
                            export PATH="/opt/homebrew/opt/musl-cross/bin:$PATH"
                        else
                            log_error "aarch64-linux-musl-gcc not found. Please reinstall musl-cross with: brew reinstall FiloSottile/musl-cross/musl-cross --with-aarch64"
                            exit 1
                        fi
                    fi
                else
                    log_error "Could not determine musl-cross installation path."
                    log_error "Please ensure musl-cross is installed with: brew install FiloSottile/musl-cross/musl-cross --with-aarch64"
                    exit 1
                fi
            else
                log_error "musl-cross not found. Please install with: brew install FiloSottile/musl-cross/musl-cross --with-aarch64"
                exit 1
            fi
        else
            log_error "brew not found and musl-cross not installed in standard locations."
            log_error "Please install musl-cross and ensure the compiler is available in PATH."
            exit 1
        fi
    fi
    
    # Final verification
    if ! command -v aarch64-linux-musl-gcc &> /dev/null; then
        log_error "aarch64-linux-musl-gcc still not found in PATH after setup. Build will likely fail."
        log_error "Please add the musl-cross bin directory to your PATH manually or reinstall musl-cross."
        exit 1
    fi
    
    # Check for OpenSSL with flexible version checking
    log_info "Checking for OpenSSL..."
    
    if command -v openssl &> /dev/null; then
        local openssl_path=$(dirname $(which openssl))
        local openssl_version=$(openssl version | awk '{print $2}')
        log_success "Found OpenSSL $openssl_version at: $(which openssl)"
        
        # Set OPENSSL_DIR to the parent directory of the openssl binary
        export OPENSSL_DIR="$(dirname $openssl_path)"
        log_info "Set OPENSSL_DIR=$OPENSSL_DIR"
    else
        # Try standard Homebrew locations if command not found
        if [ -f "/usr/local/opt/openssl@1.1/bin/openssl" ]; then
            export OPENSSL_DIR="/usr/local/opt/openssl@1.1"
            log_success "Found OpenSSL at $OPENSSL_DIR"
        elif [ -f "/usr/local/opt/openssl@3/bin/openssl" ]; then
            export OPENSSL_DIR="/usr/local/opt/openssl@3"
            log_success "Found OpenSSL at $OPENSSL_DIR"
        elif [ -f "/opt/homebrew/opt/openssl@1.1/bin/openssl" ]; then
            export OPENSSL_DIR="/opt/homebrew/opt/openssl@1.1"
            log_success "Found OpenSSL at $OPENSSL_DIR"
        elif [ -f "/opt/homebrew/opt/openssl@3/bin/openssl" ]; then
            export OPENSSL_DIR="/opt/homebrew/opt/openssl@3"
            log_success "Found OpenSSL at $OPENSSL_DIR"
        else
            log_error "OpenSSL not found. Please install OpenSSL via: brew install openssl"
            exit 1
        fi
    fi
    
    log_success "All prerequisites checked."
}

# Check common Cargo.toml for correct configuration
check_common_cargo() {
    local common_cargo="$BACKEND_DIR/common/Cargo.toml"
    log_info "Checking common Cargo.toml configuration..."
    
    # Check if common Cargo.toml exists
    if [ ! -f "$common_cargo" ]; then
        log_error "Common Cargo.toml not found at $common_cargo"
        exit 1
    fi
    
    # Check for OpenSSL features
    if ! grep -q '\[features\]' "$common_cargo"; then
        log_error "Features section not found in common Cargo.toml"
        exit 1
    fi
    
    if ! grep -q 'openssl.*=.*\[\]' "$common_cargo"; then
        log_warning "OpenSSL feature not properly defined in common Cargo.toml"
        log_info "Please ensure common/Cargo.toml has proper OpenSSL features defined"
    fi
    
    # No longer need to check for patches since we're using environment variables

    log_success "Common Cargo.toml configuration checked"
}

# Print usage
print_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  --help, -h           Show this help message and exit"
    echo "  --clean              Clean all build artifacts before building"
    echo "  --target TARGET      Set the target architecture (default: aarch64-unknown-linux-musl)"
    echo "  --skip-common        Skip building the common library"
    echo "  --skip-ai            Skip building the AI service (avoids compiling torch-sys dependencies)"
    echo "  --rust-version VER   Set the Rust version to use (default: 1.85.0)"
    echo "  --lambda-runtime RT  Set the Lambda runtime (default: provided.al2023)"
}

main "$@"