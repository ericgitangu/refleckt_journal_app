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

# More robust prerequisite checking
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check OS type for platform-specific setup
    local os_type="$(uname -s | tr '[:upper:]' '[:lower:]')"
    local arch="$(uname -m)"
    
    log_info "Detected OS: $os_type, Architecture: $arch"
    
    # Check if we need an aarch64 cross-compiler
    if [[ "${TARGET:-aarch64-unknown-linux-musl}" == *"aarch64"* ]]; then
        log_info "Checking for aarch64 cross-compiler..."
        
        # Check if the compiler is already installed
        if command -v aarch64-linux-musl-gcc &> /dev/null; then
            gcc_path=$(command -v aarch64-linux-musl-gcc)
            log_success "Found aarch64-linux-musl-gcc in PATH at: $gcc_path"
            return 0
        fi
        
        # OS-specific installation methods
        case "$os_type" in
            darwin)
                # macOS installation via Homebrew
                if command -v brew &> /dev/null; then
                    log_warning "aarch64-linux-musl-gcc not found. Installing via Homebrew..."
                    brew install FiloSottile/musl-cross/musl-cross --with-aarch64
                    if [ $? -eq 0 ]; then
                        log_success "musl-cross installed successfully."
                        # Update PATH to include the new installation
                        local brew_prefix=$(brew --prefix musl-cross 2>/dev/null || echo "")
                        if [ -n "$brew_prefix" ]; then
                            export PATH="$brew_prefix/bin:$PATH"
                        fi
                    else
                        log_error "Failed to install musl-cross. Please install manually with: brew install FiloSottile/musl-cross/musl-cross"
        exit 1
    fi
                else
                    log_error "brew not found. Please install Homebrew first or install musl-cross manually."
        exit 1
    fi
                ;;
                
            linux)
                # Linux installation based on available package managers
                if command -v apt-get &> /dev/null; then
                    # Debian/Ubuntu
                    log_warning "aarch64-linux-musl-gcc not found. Installing via apt..."
                    if sudo apt-get update && sudo apt-get install -y musl-tools gcc-aarch64-linux-gnu; then
                        log_success "Cross-compiler tools installed successfully."
                    else
                        log_error "Failed to install cross-compiler tools. Please install manually with: sudo apt-get install musl-tools gcc-aarch64-linux-gnu"
        exit 1
    fi
                elif command -v dnf &> /dev/null; then
                    # Fedora/RHEL
                    log_warning "aarch64-linux-musl-gcc not found. Installing via dnf..."
                    if sudo dnf install -y musl-gcc aarch64-linux-gnu-gcc; then
                        log_success "Cross-compiler tools installed successfully."
                    else
                        log_error "Failed to install cross-compiler tools. Please install manually with: sudo dnf install musl-gcc aarch64-linux-gnu-gcc"
            exit 1
        fi
                elif command -v yum &> /dev/null; then
                    # CentOS/older RHEL
                    log_warning "aarch64-linux-musl-gcc not found. Installing via yum..."
                    if sudo yum install -y musl-gcc aarch64-linux-gnu-gcc; then
                        log_success "Cross-compiler tools installed successfully."
                    else
                        log_error "Failed to install cross-compiler tools. Please install manually."
                        exit 1
                    fi
                else
                    log_error "No supported package manager found. Please install required tools manually:"
                    log_error "On Debian/Ubuntu: sudo apt-get install musl-tools gcc-aarch64-linux-gnu"
                    log_error "On Fedora/RHEL: sudo dnf install musl-gcc aarch64-linux-gnu-gcc"
        exit 1
    fi
                ;;
                
            *)
                log_error "Unsupported operating system: $os_type"
                log_error "Please install the required tools manually."
            exit 1
                ;;
        esac
    fi
    
    # Check Rust installation
    if ! command -v rustup &> /dev/null; then
        log_error "rustup not found. Please install Rust first."
            exit 1
    fi
    
    # Check if cargo-lambda is installed
    if ! command -v cargo-lambda &> /dev/null; then
        log_warning "cargo-lambda not found. Installing..."
        cargo install cargo-lambda
        if [ $? -ne 0 ]; then
            log_error "Failed to install cargo-lambda. Please install manually with: cargo install cargo-lambda"
            exit 1
        fi
    fi
    
    log_success "All prerequisites are installed."
    return 0
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
    
    # Define LOCAL_BIN_DIR if not already set
    if [ -z "$LOCAL_BIN_DIR" ]; then
        # Check if running in WSL
        if grep -q Microsoft /proc/version 2>/dev/null || grep -q WSL /proc/version 2>/dev/null; then
            # Running in WSL - use Linux home directory to avoid Windows filesystem permission issues
            WSL_DETECTED=true
            WSL_HOME=$(eval echo ~$USER)
            LOCAL_BIN_DIR="$WSL_HOME/.local/refleckt_bin"
            log_warning "WSL detected - using Linux filesystem path for LOCAL_BIN_DIR: $LOCAL_BIN_DIR"
        else
            # Not in WSL - use default path
            LOCAL_BIN_DIR="$BACKEND_DIR/.local/bin"
        fi
        log_warning "LOCAL_BIN_DIR was not set, defaulting to $LOCAL_BIN_DIR"
    fi
    
    # Verify directory path is valid
    if [ -z "$LOCAL_BIN_DIR" ]; then
        log_error "LOCAL_BIN_DIR is still empty after attempting to set default. Cannot proceed."
        return 1
    fi
    
    # Create local bin directory if it doesn't exist
    log_info "Creating local bin directory at: $LOCAL_BIN_DIR"
    if ! mkdir -p "$LOCAL_BIN_DIR"; then
        log_error "Failed to create directory: $LOCAL_BIN_DIR"
        log_error "Check file permissions and path validity"
        return 1
    fi

    # Check if we're on macOS
    if [ "$(uname -s)" = "Darwin" ]; then
        log_info "macOS detected, setting up ar symlinks"
        
        # Check if system ar exists
        if [ -f "/usr/bin/ar" ]; then
            log_info "Using system ar as a replacement for llvm-ar"
            
            # Create symlink to system ar if it doesn't exist
            if [ ! -f "$LOCAL_BIN_DIR/llvm-ar" ]; then
                # Create lightweight wrapper instead of symlink for better compatibility
                create_lightweight_llvm_ar
            else
                log_info "llvm-ar wrapper already exists"
            fi
            
            # Set environment variables to use system ar
            export AR="/usr/bin/ar"
            export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_MUSL_AR="/usr/bin/ar"
            
            log_success "Using system ar for cross-compilation"
        else
            log_warning "System ar not found at /usr/bin/ar"
            
            # Create minimal llvm-ar if system ar is not available
            create_lightweight_llvm_ar
        fi
    else
        log_info "Linux system detected, checking for ar"
        
        # For Linux, directly create a lightweight wrapper
        # that handles multiple possible ar locations
        create_lightweight_llvm_ar
        
        # Set environment variables for build scripts
        if command -v ar &>/dev/null; then
            AR_PATH=$(command -v ar)
            export AR="$AR_PATH"
            export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_MUSL_AR="$AR_PATH"
            log_success "Set AR environment variables to system ar at $AR_PATH"
        else
            log_warning "Could not find system ar in PATH, relying on wrapper script"
        fi
    fi
    
    # Verify llvm-ar setup
    verify_llvm_ar
}

# Create lightweight llvm-ar wrapper script or download if needed
create_lightweight_llvm_ar() {
    log_info "Setting up lightweight llvm-ar..."
    
    # Detect OS type for platform-specific configuration
    local os_type="$(uname -s | tr '[:upper:]' '[:lower:]')"
    local arch="$(uname -m)"
    local download_needed=false
    
    # Check if running in WSL
    local in_wsl=false
    if [[ -n "${WSL_DETECTED:-}" ]] || grep -q Microsoft /proc/version 2>/dev/null || grep -q WSL /proc/version 2>/dev/null; then
        in_wsl=true
        log_info "WSL environment detected, using Linux-specific handling"
        os_type="linux"
    fi
    
    # Check if ar exists in standard locations
    local found_ar=""
    for ar_path in "/usr/bin/ar" "/bin/ar" "/usr/local/bin/ar"; do
        if [ -x "$ar_path" ]; then
            found_ar="$ar_path"
            break
        fi
    done
    
    # If we didn't find ar directly, try command -v
    if [ -z "$found_ar" ] && command -v ar &>/dev/null; then
        found_ar=$(command -v ar)
    fi
    
    # If found, create a wrapper script
    if [ -n "$found_ar" ]; then
        log_info "Found system ar at $found_ar"
        
        # Create a wrapper script
        cat > "$LOCAL_BIN_DIR/llvm-ar" << EOF
#!/bin/bash
# Lightweight llvm-ar replacement
exec $found_ar "\$@"
EOF
        chmod +x "$LOCAL_BIN_DIR/llvm-ar"
        
        # Test the wrapper immediately to ensure it works
        if ! "$LOCAL_BIN_DIR/llvm-ar" --version &>/dev/null; then
            if [ "$in_wsl" = true ]; then
                log_warning "Permission issue in WSL - wrapper script not working, will download binary instead"
                download_needed=true
            else
                log_warning "Wrapper script not working, will try to download binary instead"
                download_needed=true
            fi
        else
            log_success "Created and tested llvm-ar wrapper using system ar at $found_ar"
        fi
    else
        # No ar found, we'll need to download it
        download_needed=true
    fi
    
    # Download ar binary if needed
    if [ "$download_needed" = true ]; then
        log_warning "No working system ar found, attempting to download a prebuilt binary..."
        
        # Create temp directory for downloads
        local tmp_dir=$(mktemp -d)
        local download_url=""
        local binary_path=""
        
        # Set platform-specific download URLs - using latest verified links for LLVM 17.0.6
        if [ "$os_type" = "darwin" ]; then
            if [ "$arch" = "arm64" ] || [ "$arch" = "aarch64" ]; then
                # macOS arm64
                download_url="https://github.com/llvm/llvm-project/releases/download/llvmorg-17.0.6/clang+llvm-17.0.6-arm64-apple-darwin.tar.xz"
                binary_path="clang+llvm-17.0.6-arm64-apple-darwin/bin/llvm-ar"
            else
                # macOS x86_64
                download_url="https://github.com/llvm/llvm-project/releases/download/llvmorg-17.0.6/clang+llvm-17.0.6-x86_64-apple-darwin.tar.xz"
                binary_path="clang+llvm-17.0.6-x86_64-apple-darwin/bin/llvm-ar"
            fi
        else
            # Linux or WSL
            if [ "$arch" = "x86_64" ]; then
                # Linux x86_64
                download_url="https://github.com/llvm/llvm-project/releases/download/llvmorg-17.0.6/clang+llvm-17.0.6-x86_64-linux-gnu-ubuntu-22.04.tar.xz"
                binary_path="clang+llvm-17.0.6-x86_64-linux-gnu-ubuntu-22.04/bin/llvm-ar"
            elif [ "$arch" = "aarch64" ] || [ "$arch" = "arm64" ]; then
                # Linux arm64
                download_url="https://github.com/llvm/llvm-project/releases/download/llvmorg-17.0.6/clang+llvm-17.0.6-aarch64-linux-gnu-ubuntu-22.04.tar.xz"
                binary_path="clang+llvm-17.0.6-aarch64-linux-gnu-ubuntu-22.04/bin/llvm-ar"
            else
                log_error "Unsupported architecture: $arch. Cannot download prebuilt binary."
                log_error "Please install binutils manually with your package manager."
                return 1
            fi
        fi
        
        # Download and extract the binary
        log_info "Downloading from $download_url..."
        local archive_file="$tmp_dir/llvm.tar.xz"
        
        # Check if curl is available
        if ! command -v curl &>/dev/null; then
            log_error "curl is required for downloading. Please install curl first."
            log_error "Debian/Ubuntu: sudo apt-get install curl"
            log_error "Fedora/RHEL:   sudo dnf install curl"
            log_error "macOS:         brew install curl"
            return 1
        fi
        
        # Download the archive
        if ! curl -SLo "$archive_file" "$download_url"; then
            log_error "Failed to download from $download_url"
            rm -rf "$tmp_dir"
            return 1
        fi
        
        # Check if tar exists for extraction
        if ! command -v tar &>/dev/null; then
            log_error "tar is required for extraction. Please install tar first."
            rm -rf "$tmp_dir"
            return 1
        fi
        
        # Extract the archive
        log_info "Extracting archive..."
        if ! tar -xf "$archive_file" -C "$tmp_dir"; then
            log_error "Failed to extract archive"
            rm -rf "$tmp_dir"
            return 1
        fi
        
        # Copy the binary to the local bin directory
        local extracted_binary="$tmp_dir/$binary_path"
        if [ ! -f "$extracted_binary" ]; then
            log_error "Binary not found in extracted archive: $extracted_binary"
            log_error "Archive structure may have changed. Searching for llvm-ar..."
            
            # Try to find the binary elsewhere in the archive
            local found_binary=$(find "$tmp_dir" -name "llvm-ar" -type f | head -n 1)
            if [ -n "$found_binary" ]; then
                log_info "Found llvm-ar at alternative path: $found_binary"
                extracted_binary="$found_binary"
            else
                rm -rf "$tmp_dir"
                return 1
            fi
        fi
        
        log_info "Installing $extracted_binary to $LOCAL_BIN_DIR/llvm-ar"
        cp "$extracted_binary" "$LOCAL_BIN_DIR/llvm-ar"
        chmod +x "$LOCAL_BIN_DIR/llvm-ar"
        
        # Clean up
        rm -rf "$tmp_dir"
        log_success "Downloaded and installed llvm-ar to $LOCAL_BIN_DIR/llvm-ar"
    fi
    
    # Test the binary or wrapper
    if "$LOCAL_BIN_DIR/llvm-ar" --version &>/dev/null; then
        log_success "llvm-ar is working correctly"
    else
        log_error "llvm-ar installation failed. The binary doesn't work."
        
        if [ "$in_wsl" = true ]; then
            log_error "In WSL, ensure you're using a Linux filesystem path (not /mnt/c/...)"
            log_error "Current path: $LOCAL_BIN_DIR"
            log_error "Try setting LOCAL_BIN_DIR to a path in your Linux home directory before running this script"
        fi
        
        # Create a fallback error wrapper if the binary doesn't work
        cat > "$LOCAL_BIN_DIR/llvm-ar" << 'EOF'
#!/bin/bash
echo "Error: llvm-ar could not be set up properly." >&2
echo "Please install binutils manually:" >&2
echo "  Debian/Ubuntu: sudo apt-get install binutils" >&2
echo "  Fedora/RHEL:   sudo dnf install binutils" >&2
echo "  macOS:         brew install llvm" >&2
exit 1
EOF
        chmod +x "$LOCAL_BIN_DIR/llvm-ar"
        log_warning "Created fallback error wrapper that will tell users how to install binutils"
        return 1
    fi
    
    # Set environment variables for the new ar binary
    export AR="$LOCAL_BIN_DIR/llvm-ar"
    export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_MUSL_AR="$LOCAL_BIN_DIR/llvm-ar"
    
    # Add to PATH to ensure it's available
    export PATH="$LOCAL_BIN_DIR:$PATH"
    
    return 0
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