#!/bin/bash
# Script to set up consistent rust-toolchain.toml files across all services

set -e

# Directory containing this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

# Source utils.sh for helper functions
source "$SCRIPT_DIR/utils.sh"

# Services list (adjust as needed)
SERVICES=(
    "common"
    "authorizer"
    "analytics-service"
    "ai-service"
    "entry-service"
    "settings-service"
    "prompts-service"
)

# Create root toolchain file
create_root_toolchain() {
    log_info "Creating root toolchain file..."
    
    cat > "$BACKEND_DIR/rust-toolchain.toml" << EOF
[toolchain]
channel = "1.84.0"
components = ["rustfmt", "clippy"]
targets = ["aarch64-unknown-linux-musl"]
profile = "minimal"
EOF
    
    log_success "Root toolchain file created successfully"
}

# Add toolchain file to a service
add_toolchain_to_service() {
    local service="$1"
    local service_dir="$BACKEND_DIR/$service"
    
    # Check if service directory exists
    if [ ! -d "$service_dir" ]; then
        log_warning "Service directory $service does not exist. Skipping."
        return 0
    fi
    
    log_info "Adding toolchain file to $service..."
    
    # Create rust-toolchain.toml in the service directory
    cat > "$service_dir/rust-toolchain.toml" << EOF
[toolchain]
channel = "1.84.0"
components = ["rustfmt", "clippy"]
targets = ["aarch64-unknown-linux-musl"]
profile = "minimal"
EOF
    
    log_success "Toolchain file added to $service"
}

# Main function
main() {
    log_info "Setting up Rust toolchain files..."
    
    # Create the root toolchain file
    create_root_toolchain
    
    # Add toolchain files to all services
    for service in "${SERVICES[@]}"; do
        add_toolchain_to_service "$service"
    done
    
    log_success "All toolchain files set up successfully!"
    log_info "Run 'rustup show' to verify your toolchain settings."
}

# Run the main function
main "$@" 