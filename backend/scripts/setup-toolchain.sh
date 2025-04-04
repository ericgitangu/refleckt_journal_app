#!/bin/bash
# Script to set up consistent rust-toolchain.toml file at the root level

set -e

# Directory containing this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

# Source utils.sh for helper functions
source "$SCRIPT_DIR/utils.sh"

# Create root toolchain file
create_root_toolchain() {
    log_info "Creating root toolchain file..."
    
    cat > "$BACKEND_DIR/rust-toolchain.toml" << EOF
[toolchain]
channel = "1.85.0"
components = ["rustfmt", "clippy"]
targets = ["aarch64-unknown-linux-musl"]
profile = "minimal"
EOF
    
    log_success "Root toolchain file created successfully"
}

# Configure cargo to use system linker and avoid LLVM
configure_cargo() {
    log_info "Configuring cargo for cross-compilation..."
    
    mkdir -p "$BACKEND_DIR/.cargo"
    
    cat > "$BACKEND_DIR/.cargo/config.toml" << EOF
[build]
rustflags = ["-C", "link-arg=-s"]

[target.aarch64-unknown-linux-musl]
linker = "rust-lld"
rustflags = ["-C", "link-self-contained=yes"]

[target.x86_64-unknown-linux-gnu]
rustflags = ["-C", "target-feature=-avx512f"]
EOF
    
    log_success "Cargo configured for macOS cross-compilation"
}

# Remove any service-specific toolchain files
remove_service_toolchains() {
    log_info "Removing any service-specific toolchain files..."
    
    # List of services (update as needed)
    SERVICES=(
        "common"
        "authorizer"
        "analytics-service"
        "ai-service" 
        "entry-service"
        "settings-service"
        "prompts-service"
    )
    
    for service in "${SERVICES[@]}"; do
        local service_dir="$BACKEND_DIR/$service"
        local toolchain_file="$service_dir/rust-toolchain.toml"
        
        if [ -f "$toolchain_file" ]; then
            log_info "Removing toolchain file from $service..."
            rm "$toolchain_file"
            log_success "Removed toolchain file from $service"
        fi
    done
}

# Main function
main() {
    log_info "Setting up consolidated Rust toolchain file..."
    
    # Create the root toolchain file
    create_root_toolchain
    
    # Configure cargo
    configure_cargo
    
    # Remove any service-specific toolchain files
    remove_service_toolchains
    
    log_success "Consolidated toolchain setup complete!"
    log_info "A single rust-toolchain.toml file is now used at the root level."
    log_info "Run 'rustup show' to verify your toolchain settings."
}

# Run the main function
main "$@" 