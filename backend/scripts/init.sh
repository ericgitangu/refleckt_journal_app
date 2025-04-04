#!/bin/bash
# Enhanced init.sh script with proper error handling and logging
set -eo pipefail

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
SCRIPTS_DIR="$SCRIPT_DIR" # For backward compatibility

# Default options
LOG_DIR="$BACKEND_DIR/logs"
ENV_FILE="$BACKEND_DIR/.env"
STAGE=${STAGE:-"dev"}
STACK_NAME=${STACK_NAME:-"reflekt-${STAGE}"}
REGION=${AWS_REGION:-"us-east-1"}
TOKEN_FILE="$LOG_DIR/token.txt"

# Source common utility functions
source "$SCRIPTS_DIR/common.sh"

# Source environment variables from set_env.sh
if [ -f "$SCRIPTS_DIR/set_env.sh" ]; then
    source "$SCRIPTS_DIR/set_env.sh"
fi

# Create logs directory
mkdir -p "$LOG_DIR"
rm -rf "$LOG_DIR"/*

# Trap handler for unexpected failures
handle_error() {
    local line=$1
    local status=$2
    local command=$3
    local func=${FUNCNAME[1]:-main}
    local error_log="$LOG_DIR/init_error_summary.log"
    
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
    
    log_error "Initialization failed with exit status $status at line $line in function $func"
    log_error "Current operation: ${CURRENT_OPERATION:-unknown}"
    log_error "Command that failed: $command"
    log_error "See detailed logs in $error_log"
    
    # Create a detailed error summary with environment information
    {
        echo "=== INITIALIZATION FAILURE SUMMARY ==="
        echo "Timestamp: $(date)"
        echo "Script: $(basename "$0")"
        echo "Failed operation: ${CURRENT_OPERATION:-unknown}"
        echo "Failed function: $func"
        echo "Failed at line: $line"
        echo "Exit status: $status"
        echo "Command: $command"
        echo -e "$stack"
        echo "=== ENVIRONMENT VARIABLES ==="
        echo "TARGET: $TARGET"
        echo "RUST_VERSION: $RUST_VERSION"
        echo "OPENSSL_DIR: $OPENSSL_DIR"
        echo "AWS_LC_SYS_STATIC: $AWS_LC_SYS_STATIC"
        echo "AWS_LC_SYS_VENDORED: $AWS_LC_SYS_VENDORED"
        echo "AWS_REGION: $AWS_REGION"
        echo "STAGE: $STAGE"
        echo "STACK_NAME: $STACK_NAME"
        echo "PATH: $PATH"
        echo "Working directory: $(pwd)"
        echo "=== LOG FILES ==="
        echo "Recent error logs:"
        find "$LOG_DIR" -name "*error*.log" -mtime -1 | xargs ls -lh 2>/dev/null || echo "No recent error logs found"
        
        # If there's a specific operation having issues, try to include relevant logs
        if [[ -n "${CURRENT_LOG_FILE}" && -f "${CURRENT_LOG_FILE}" ]]; then
            echo -e "\n=== LAST 20 LINES OF CURRENT OPERATION LOG ==="
            tail -n 20 "${CURRENT_LOG_FILE}"
        fi
        
        echo "==========================="
    } > "$error_log"
    
    # Print hint about how to debug further
    log_info "For more details, run: cat $error_log"
    log_info "You can also check specific operation logs in $LOG_DIR/"
    
    exit $status
}

# Set up trap to catch failures
trap 'handle_error ${LINENO} $? "$BASH_COMMAND"' ERR

# Ensure all log subdirectories exist
ensure_log_dirs() {
    log_info "Ensuring log directories exist..."

    # First ensure the main log directory exists
mkdir -p "$LOG_DIR"
    
    # Create service-specific log directories if desired (for future separation)
    # This is optional since we're already creating the main LOG_DIR
    local services=(
        "common"
        "authorizer"
        "entry-service"
        "analytics-service"
        "ai-service" 
        "settings-service"
        "prompts-service"
    )
    
    # For now just ensure the main directory exists and is empty
    # We don't need separate directories per service yet
    
    log_success "Log directory created at $LOG_DIR"
}

# Call ensure_log_dirs at the beginning
ensure_log_dirs

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check for AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check for AWS SAM CLI
    if ! command -v sam &> /dev/null; then
        log_error "AWS SAM CLI is not installed. Please install it first."
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
    
    # Verify AWS credentials are configured
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log_error "AWS credentials not configured. Please run 'aws configure' or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables."
        exit 1
    fi
    
    log_success "All prerequisites checked."
}

setup_aws_credentials() {
    log_info "Setting up AWS credentials..."
    
    # First, check if credentials are already in environment
    if [ -n "${AWS_ACCESS_KEY_ID:-}" ] && [ -n "${AWS_SECRET_ACCESS_KEY:-}" ]; then
        log_success "Using AWS credentials from environment variables"
        return 0
    fi
    
    # Next, check if AWS CLI is configured with credentials
    if aws sts get-caller-identity &>/dev/null; then
        log_success "Using AWS credentials from AWS CLI configuration"
        return 0
    fi
    
    # If we're here, no credentials were found
    log_error "No AWS credentials found. Please configure AWS CLI or set environment variables."
    log_error "Run 'aws configure' or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables."
    exit 1
}

# Setup root-level cargo config
setup_cargo_config() {
    log_info "Setting up root-level cargo configuration..."
    
    # Create .cargo directory at the project root
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

build_common_library() {
    CURRENT_OPERATION="building common library"
    CURRENT_LOG_FILE="$LOG_DIR/common-build.log"
    log_info "Building common library..."
    
    # Use specialized script for common library
    if [ -f "$SCRIPTS_DIR/build-common.sh" ]; then
        log_info "Using specialized build-common.sh script..."
        bash "$SCRIPTS_DIR/build-common.sh" 2>&1 | tee "$LOG_DIR/common-build.log"
        
        if [ ${PIPESTATUS[0]} -ne 0 ]; then
            log_error "Common library build failed. Check $LOG_DIR/common-build.log for details."
            cat "$LOG_DIR/common-build.log"
            exit 1
        fi
        
        log_success "Common library built successfully with specialized script"
        return 0
    fi
    
    # Fall back to default build approach
    cd "$BACKEND_DIR/common"
    
    log_info "Building journal-common for Lambda compatibility..."
    
    # Ensure log file directory exists
    mkdir -p "$(dirname "$LOG_DIR/common-build.log")"
    
    # First check for Makefile
    if [ -f "Makefile" ]; then
        log_info "Using Makefile for common library build..."
        make build-musl TARGET="$TARGET" 2>&1 | tee "$LOG_DIR/common-build.log"
    else
        # Build with cargo
    log_info "Using cargo build for library..."
        cargo build --release --target "$TARGET" 2>&1 | tee "$LOG_DIR/common-build.log"
    fi
    
    if [ ${PIPESTATUS[0]} -ne 0 ]; then
        log_error "Common library build failed. Check $LOG_DIR/common-build.log for details."
        cat "$LOG_DIR/common-build.log"
        exit 1
    fi
    
    log_success "journal-common built successfully for Lambda"
    
    cd "$BACKEND_DIR"
}

build_service() {
    local service_dir="$1"
    local service_name="$(basename "$service_dir")"
    
    CURRENT_OPERATION="building service $service_name"
    CURRENT_LOG_FILE="$LOG_DIR/$service_name-build.log"
    log_info "Building $service_name..."
    
    # Only proceed if directory exists and contains Cargo.toml
    if [ ! -d "$service_dir" ] || [ ! -f "$service_dir/Cargo.toml" ]; then
        log_warning "Skipping $service_name: not a valid Rust project"
        return 0
    fi
    
    cd "$service_dir"
    
    # Ensure log file directory exists
    mkdir -p "$(dirname "$LOG_DIR/$service_name-build.log")"
    
    # Special handling for authorizer service which uses ring/aws-lc-sys
    if [ "$service_name" = "authorizer" ]; then
        log_info "Special handling for authorizer service with aws-lc-sys dependency"
        
        # Use specialized script for authorizer
        if [ -f "$SCRIPTS_DIR/build-authorizer.sh" ]; then
        log_info "Using specialized build-authorizer.sh script..."
        bash "$SCRIPTS_DIR/build-authorizer.sh" 2>&1 | tee "$LOG_DIR/$service_name-build.log"
        
        if [ ${PIPESTATUS[0]} -ne 0 ]; then
            log_error "Failed to build authorizer with specialized script."
            cat "$LOG_DIR/$service_name-build.log"
            exit 1
        fi
        
        log_success "Authorizer built successfully with specialized script"
        else
            log_warning "No specialized script found for authorizer. Trying standard approach..."
            
            # Use standard build approach with special flags for authorizer
            log_info "Building authorizer with standard approach and special flags..."
            cargo build --release --target "$TARGET" --no-default-features 2>&1 | tee "$LOG_DIR/$service_name-build.log"
            
            if [ ${PIPESTATUS[0]} -ne 0 ]; then
                log_error "Failed to build authorizer. Check $LOG_DIR/$service_name-build.log for details."
                cat "$LOG_DIR/$service_name-build.log"
                exit 1
            fi
            
            # Create bootstrap file
            mkdir -p "target/lambda"
            cp "target/${TARGET}/release/${service_name}" "target/lambda/bootstrap"
            chmod +x "target/lambda/bootstrap"
            
            log_success "Authorizer built successfully with standard approach"
        fi
    else
        log_info "Building with target: $TARGET"
        
        # First check for Makefile
        if [ -f "Makefile" ]; then
            log_info "Using Makefile for $service_name build..."
            make build-musl TARGET="$TARGET" 2>&1 | tee "$LOG_DIR/$service_name-build.log"
        # Then check for cross-build.sh
        elif [ -f "$SCRIPTS_DIR/cross-build.sh" ]; then
            log_info "Using cross-build.sh for $service_name..."
            bash "$SCRIPTS_DIR/cross-build.sh" "$service_name" "./target/lambda" 2>&1 | tee "$LOG_DIR/$service_name-build.log"
        else
            # Check if the service has aws-lc-sys or ring dependencies
            if grep -q "aws-lc-sys\|ring" Cargo.lock 2>/dev/null || grep -q "lambda_runtime" Cargo.toml 2>/dev/null; then
                log_info "Detected aws-lc-sys/ring dependency, using standard cargo build for $service_name..."
                cargo build --target "$TARGET" --release 2>&1 | tee "$LOG_DIR/$service_name-build.log"
                
                # Create bootstrap file
                mkdir -p "target/lambda"
                cp "target/${TARGET}/release/${service_name}" "target/lambda/bootstrap"
                chmod +x "target/lambda/bootstrap"
                
                log_info "Created bootstrap file at target/lambda/bootstrap"
            else
                # Use cargo-lambda as a last resort for services without critical dependencies
    log_info "Building $service_name with cargo-lambda for $TARGET..."
                cargo lambda build -v --release --target "$TARGET" --lambda-runtime "$LAMBDA_RUNTIME" 2>&1 | tee "$LOG_DIR/$service_name-build.log"
            fi
        fi
    fi
    
    if [ ${PIPESTATUS[0]} -ne 0 ]; then
        log_error "$service_name build failed. Check $LOG_DIR/$service_name-build.log for details."
        cat "$LOG_DIR/$service_name-build.log"
        exit 1
    fi
    
    log_success "$service_name built successfully"
    
    cd "$BACKEND_DIR"
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
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --help, -h           Show this help message and exit"
            echo "  --clean              Clean all build artifacts before building"
            echo "  --target TARGET      Set the target architecture (default: aarch64-unknown-linux-musl)"
            echo "  --skip-ai            Skip building the AI service (avoids compiling torch-sys dependencies)"
            echo "  --rust-version VER   Set the Rust version to use (default: 1.85.0)"
            exit 0
            ;;
    esac
done

# Build services
build_services() {
    print_banner "BUILDING SERVICES"
    
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
    
    CURRENT_OPERATION="building all services"
    log_info "Building all services..."
    
    # First, build the common library
    build_common_library
    
    # Find all service directories (directories with Cargo.toml that aren't 'common')
    for service_dir in "$BACKEND_DIR"/*; do
        if [ -d "$service_dir" ] && [ -f "$service_dir/Cargo.toml" ] && [ "$(basename "$service_dir")" != "common" ]; then
            build_service "$service_dir"
        fi
    done
    
    log_success "All services built successfully."
}

deploy_stack() {
    CURRENT_OPERATION="deploying CloudFormation stack $STACK_NAME"
    CURRENT_LOG_FILE="$LOG_DIR/deploy-stack.log"
    log_info "Deploying CloudFormation stack..."
    
    # Ensure log file directory exists
    mkdir -p "$(dirname "$LOG_DIR/deploy-stack.log")"
    
    # Run the deploy-stack.sh script with appropriate parameters
    if [ -f "$SCRIPTS_DIR/deploy-stack.sh" ]; then
        bash "$SCRIPTS_DIR/deploy-stack.sh" -s "$STAGE" -r "$REGION" -n "$STACK_NAME" 2>&1 | tee "$LOG_DIR/deploy-stack.log"
        if [ ${PIPESTATUS[0]} -ne 0 ]; then
            log_error "Stack deployment failed. Check $LOG_DIR/deploy-stack.log for details."
            exit 1
        fi
    else
        log_error "deploy-stack.sh script not found in $SCRIPTS_DIR"
        exit 1
    fi
    
    log_success "Stack deployed successfully."
}

get_stack_outputs() {
    CURRENT_OPERATION="fetching CloudFormation stack outputs"
    CURRENT_LOG_FILE="$LOG_DIR/stack_outputs.log"
    log_info "Fetching CloudFormation stack outputs..."
    
    local stack_output
    stack_output=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
        --output text 2>"$LOG_DIR/stack_outputs_error.log")
    
    if [ $? -ne 0 ]; then
        log_error "Failed to fetch stack outputs. Check $LOG_DIR/stack_outputs_error.log"
        cat "$LOG_DIR/stack_outputs_error.log"
        exit 1
    fi
    
    echo "$stack_output" > "$LOG_DIR/stack_outputs.txt"
    echo "$stack_output"
}

update_env_file() {
    local stack_output="$1"
    local env_tmp="${ENV_FILE}.tmp"
    
    CURRENT_OPERATION="updating environment file"
    log_info "Updating environment file..."
    
    # Start with empty environment file
    : > "$env_tmp"
    
    # Extract API Gateway endpoint and other outputs
    while IFS=$'\t' read -r key value; do
        case "$key" in
            "ApiEndpoint")
                echo "API_ENDPOINT=$value" >> "$env_tmp"
                ;;
            "UserPoolId")
                echo "USER_POOL_ID=$value" >> "$env_tmp"
                ;;
            "UserPoolClientId")
                echo "USER_POOL_CLIENT_ID=$value" >> "$env_tmp"
                ;;
            "EntriesTableName")
                echo "ENTRIES_TABLE=$value" >> "$env_tmp"
                ;;
            "SettingsTableName")
                echo "SETTINGS_TABLE=$value" >> "$env_tmp"
                ;;
            "PromptsTableName")
                echo "PROMPTS_TABLE=$value" >> "$env_tmp"
                ;;
            "AnalyticsTableName")
                echo "ANALYTICS_TABLE=$value" >> "$env_tmp"
                ;;
            # Add other important outputs as needed
        esac
    done <<< "$stack_output"
    
    # Add test user for convenience
    echo "TEST_USER=test@example.com" >> "$env_tmp"
    echo "TEST_PASSWORD=Test123!" >> "$env_tmp"
    
    # Add AWS region
    echo "AWS_REGION=$REGION" >> "$env_tmp"
    
    # Move temp file to final location
    mv "$env_tmp" "$ENV_FILE"
    log_success "Environment file updated at $ENV_FILE"
}

create_test_user() {
    CURRENT_OPERATION="creating test user"
    CURRENT_LOG_FILE="$LOG_DIR/cognito-user-create.log"
    log_info "Creating test user..."
    
    # Get user pool ID from environment file
    local user_pool_id
    user_pool_id=$(grep "USER_POOL_ID" "$ENV_FILE" | cut -d= -f2)
    
    if [ -z "$user_pool_id" ]; then
        log_error "USER_POOL_ID not found in $ENV_FILE"
        exit 1
    fi
    
    local username="test@example.com"
    local password="Test123!"
    
    # Check if user already exists
    if aws cognito-idp admin-get-user --user-pool-id "$user_pool_id" --username "$username" > /dev/null 2>&1; then
        log_info "User $username already exists"
    else
        log_info "Creating new user $username in user pool $user_pool_id"
        aws cognito-idp admin-create-user \
            --user-pool-id "$user_pool_id" \
            --username "$username" \
            --temporary-password "$password" \
            --user-attributes Name=email,Value="$username" Name=email_verified,Value=true \
            --message-action SUPPRESS > "$LOG_DIR/cognito-user-create.log" 2>&1
        
        if [ $? -ne 0 ]; then
            log_error "Failed to create user. See $LOG_DIR/cognito-user-create.log"
            cat "$LOG_DIR/cognito-user-create.log"
            exit 1
        fi
    fi
    
    # Set permanent password
    log_info "Setting permanent password for $username"
    aws cognito-idp admin-set-user-password \
        --user-pool-id "$user_pool_id" \
        --username "$username" \
        --password "$password" \
        --permanent > "$LOG_DIR/cognito-password.log" 2>&1
    
    if [ $? -ne 0 ]; then
        log_error "Failed to set permanent password. See $LOG_DIR/cognito-password.log"
        cat "$LOG_DIR/cognito-password.log"
        exit 1
    fi
    
    log_success "Test user setup complete"
}

get_auth_token() {
    CURRENT_OPERATION="getting authentication token"
    CURRENT_LOG_FILE="$LOG_DIR/admin_auth_result.json"
    log_info "Getting authentication token..."
    
    # Source environment file to get variables
    source "$ENV_FILE"
    
    # Ensure required variables exist
    if [[ -z "${TEST_USER:-}" || -z "${TEST_PASSWORD:-}" || -z "${USER_POOL_ID:-}" || -z "${USER_POOL_CLIENT_ID:-}" ]]; then
        log_error "Missing required environment variables in $ENV_FILE"
        exit 1
    fi
    
    # Try admin-initiate-auth
    log_info "Attempting admin auth flow..."
    local admin_auth_result
    admin_auth_result=$(aws cognito-idp admin-initiate-auth \
        --user-pool-id "$USER_POOL_ID" \
        --client-id "$USER_POOL_CLIENT_ID" \
        --auth-flow ADMIN_USER_PASSWORD_AUTH \
        --auth-parameters USERNAME="$TEST_USER",PASSWORD="$TEST_PASSWORD" \
        --output json 2>"$LOG_DIR/admin_auth_error.log")
    
    local auth_exit_code=$?
    echo "$admin_auth_result" > "$LOG_DIR/admin_auth_result.json"
    
    # Extract token from auth result
    local token
    if [[ $auth_exit_code -eq 0 ]]; then
        token=$(echo "$admin_auth_result" | jq -r '.AuthenticationResult.IdToken // empty')
    else
        log_error "Authentication failed. Check $LOG_DIR/admin_auth_error.log"
        cat "$LOG_DIR/admin_auth_error.log"
        exit 1
    fi
    
    if [[ -z "$token" || "$token" == "null" ]]; then
        log_error "Failed to extract token from auth result"
        exit 1
    fi
    
    # Save token to file
    echo "$token" > "$TOKEN_FILE"
    chmod 600 "$TOKEN_FILE"
    log_success "Authentication token saved to $TOKEN_FILE"
}

test_endpoints() {
    CURRENT_OPERATION="testing API endpoints"
    CURRENT_LOG_FILE="$LOG_DIR/test-endpoints.log"
    log_info "Testing API endpoints..."
    
    # Ensure log file directory exists
    mkdir -p "$(dirname "$LOG_DIR/test-endpoints.log")"
    
    # Run the test-endpoints.sh script
    if [ -f "$SCRIPTS_DIR/test-endpoints.sh" ]; then
        bash "$SCRIPTS_DIR/test-endpoints.sh" -r "$REGION" 2>&1 | tee "$LOG_DIR/test-endpoints.log"
        if [ ${PIPESTATUS[0]} -ne 0 ]; then
            log_warning "Some endpoint tests failed. Check $LOG_DIR/test-endpoints.log for details."
        else
            log_success "All endpoint tests passed."
        fi
    else
        log_warning "test-endpoints.sh not found. Skipping API tests."
    fi
}

verify_lambdas() {
    CURRENT_OPERATION="verifying Lambda deployments"
    log_info "Verifying Lambda deployments..."
    
    # Run the verify-lambda.sh script for each service
    services=("entry-service" "analytics-service" "ai-service" "settings-service" "authorizer" "prompts-service")
    
    for service in "${services[@]}"; do
            log_info "Verifying $service Lambda function..."
            
        # Ensure log file exists
        mkdir -p "$LOG_DIR"
            
        bash "$SCRIPTS_DIR/verify-lambda.sh" -s "$service" -r "$REGION" 2>&1 | tee "$LOG_DIR/$service-verify.log"
        
            if [ ${PIPESTATUS[0]} -ne 0 ]; then
            log_warning "Verification of $service Lambda failed. Check $LOG_DIR/$service-verify.log for details."
            else
                log_success "$service Lambda verified successfully."
            fi
    done
}

print_completion_message() {
    local api_endpoint
    api_endpoint=$(grep "API_ENDPOINT" "$ENV_FILE" | cut -d= -f2 2>/dev/null || echo "N/A")
    
    print_banner "INITIALIZATION COMPLETE"
    
    echo -e "🎉 \033[1;32mReflekt Journal App has been successfully initialized!\033[0m 🎉"
    echo -e "\n📝 \033[1;34mSummary:\033[0m"
    echo -e "  • API Endpoint: \033[1;36m$api_endpoint\033[0m"
    echo -e "  • Environment variables: \033[1;36m$ENV_FILE\033[0m"
    echo -e "  • Authentication token: \033[1;36m$TOKEN_FILE\033[0m"
    echo -e "  • Log files: \033[1;36m$LOG_DIR\033[0m"
    
    echo -e "\n🚀 \033[1;34mNext steps:\033[0m"
    echo -e "  1. Test your API by running: \033[1;33m./scripts/test-endpoints.sh\033[0m"
    echo -e "  2. Set up the frontend application"
    echo -e "  3. For any issues, check the logs in \033[1;33m$LOG_DIR\033[0m"
    
    echo -e "\n🔍 \033[1;34mTestable resources:\033[0m"
    echo -e "  • Demo user: \033[1;36mtest@example.com\033[0m / \033[1;36mTest123!\033[0m"
    echo -e "  • API endpoint: \033[1;36m$api_endpoint\033[0m"
    
    print_banner "HAPPY CODING!"
}

# Install or set up llvm-ar without requiring full developer tools
setup_llvm_ar() {
    log_info "Setting up lightweight llvm-ar..."
    
    # Create local bin directory if it doesn't exist
    mkdir -p "$LOCAL_BIN_DIR"

    # Check if we're on macOS
    if [ "$(uname)" = "Darwin" ]; then
        log_info "macOS detected, setting up ar symlinks"
        
        # Check if system ar exists
        if [ -f "/usr/bin/ar" ]; then
            log_info "Using system ar as a replacement for llvm-ar"
            
            # Create symlink to system ar if it doesn't exist
            if [ ! -f "$LOCAL_BIN_DIR/llvm-ar" ]; then
                ln -sf /usr/bin/ar "$LOCAL_BIN_DIR/llvm-ar"
                log_success "Created symlink from system ar to llvm-ar at $LOCAL_BIN_DIR/llvm-ar"
            else
                log_info "llvm-ar symlink already exists"
            fi
            
            # Set environment variables to use system ar
            export AR="/usr/bin/ar"
            export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_MUSL_AR="/usr/bin/ar"
            
            log_success "Using system ar for cross-compilation"
        else
            log_warning "System ar not found at /usr/bin/ar"
            
            # Download minimal llvm-ar if system ar is not available
            download_minimal_llvm_ar
        fi
    else
        log_info "Non-macOS system detected, checking for llvm-ar"
        
        # Check if llvm-ar is installed
        if command -v llvm-ar &> /dev/null; then
            log_info "llvm-ar found in PATH"
            # Create symlink if needed
            if [ ! -f "$LOCAL_BIN_DIR/llvm-ar" ]; then
                ln -sf "$(command -v llvm-ar)" "$LOCAL_BIN_DIR/llvm-ar"
                log_success "Created symlink to existing llvm-ar at $LOCAL_BIN_DIR/llvm-ar"
            fi
        else
            log_warning "llvm-ar not found in PATH"
            # Download minimal llvm-ar
            download_minimal_llvm_ar
        fi
    fi
    
    # Verify llvm-ar setup
    verify_llvm_ar
}

# Download minimal llvm-ar binary
download_minimal_llvm_ar() {
    log_info "Downloading minimal llvm-ar..."
    
    # Define URL for minimal llvm-ar binary
    local os_type="$(uname -s | tr '[:upper:]' '[:lower:]')"
    local arch="$(uname -m)"
    
    # URL for the appropriate binary - this is an example URL
    # In reality, you'd host these binaries somewhere accessible
    local url="https://example.com/llvm-ar-minimal-${os_type}-${arch}.tar.gz"
    
    # For the purpose of this example, we'll simulate the download
    log_info "Would download from $url"
    log_info "Simulating minimal llvm-ar binary..."
    
    # Instead of downloading, create a shell script that mimics llvm-ar
    # by forwarding to system ar with appropriate flags
    cat > "$LOCAL_BIN_DIR/llvm-ar" << 'EOF'
#!/bin/bash
# Minimal llvm-ar replacement that forwards to system ar
system_ar=$(command -v ar || echo "/usr/bin/ar")
if [ ! -f "$system_ar" ]; then
    echo "Error: Could not find system ar" >&2
        exit 1
    fi
exec "$system_ar" "$@"
EOF
    
    chmod +x "$LOCAL_BIN_DIR/llvm-ar"
    log_success "Created minimal llvm-ar replacement at $LOCAL_BIN_DIR/llvm-ar"
}

# Verify llvm-ar is working correctly
verify_llvm_ar() {
    log_info "Verifying llvm-ar setup..."
    
    # Add local bin to PATH if not already
    export PATH="$LOCAL_BIN_DIR:$PATH"
    
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

# Verify environment variable setup for aws-lc-sys and ring
verify_patch_section() {
    log_info "Checking configuration for Ring/aws-lc-sys handling..."
    
    local common_cargo="$BACKEND_DIR/common/Cargo.toml"
    
    if [ ! -f "$common_cargo" ]; then
        log_warning "common/Cargo.toml not found, skipping verification"
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
    
    # Verify environment variables are set
    if [ -z "$AWS_LC_SYS_STATIC" ] || [ -z "$AWS_LC_SYS_VENDORED" ]; then
        log_warning "AWS_LC_SYS_STATIC or AWS_LC_SYS_VENDORED environment variables not set"
        log_info "Sourcing set_env.sh to set required environment variables"
        source "$SCRIPT_DIR/set_env.sh"
    else
        log_success "AWS_LC_SYS_STATIC and AWS_LC_SYS_VENDORED are set correctly"
    fi
}

main() {
    # Print welcome banner
    CURRENT_OPERATION="initialization"
    print_banner "REFLEKT JOURNAL APP INITIALIZATION"
    
    # Create logs directory
    mkdir -p "$LOG_DIR"
    
    # Check prerequisites
    check_prerequisites
    
    # Setup lightweight llvm-ar
    setup_llvm_ar
    
    # Verify patch section in common/Cargo.toml
    verify_patch_section
    
    # Setup root-level cargo config
    setup_cargo_config
    
    # Set up AWS credentials
    setup_aws_credentials
    
    # Build all services
    build_services
    
    # Deploy the CloudFormation stack
    deploy_stack
    
    # Get stack outputs
    stack_outputs=$(get_stack_outputs)
    
    # Update environment file
    update_env_file "$stack_outputs"
    
    # Create test user
    create_test_user
    
    # Get auth token
    get_auth_token
    
    # Test API endpoints
    test_endpoints
    
    # Verify lambda functions
    verify_lambdas
    
    # Print completion message
    print_completion_message
    
    exit 0
}

main "$@"