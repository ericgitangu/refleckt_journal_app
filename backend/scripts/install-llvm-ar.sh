#!/bin/bash
# install-llvm-ar.sh: Truly lightweight llvm-ar installation for cross-compilation
# This script creates a minimal llvm-ar replacement using only system tools
# WITHOUT requiring any developer tools installation

set -e

# Script constants
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
LOCAL_BIN_DIR="$BACKEND_DIR/.local/bin"

# Source the utils
source "$SCRIPT_DIR/utils.sh"

log_info "=== INSTALLING LIGHTWEIGHT LLVM-AR (NO DEVELOPER TOOLS REQUIRED) ==="

# Create local bin directory if it doesn't exist
mkdir -p "$LOCAL_BIN_DIR"

log_info "Setting up lightweight llvm-ar without developer tools..."

# Check if we're on macOS 
if [ "$(uname)" = "Darwin" ]; then
    log_info "macOS detected"
    
    # Check if system ar exists - this should exist by default on macOS
    if [ -f "/usr/bin/ar" ]; then
        log_info "Using system ar as a replacement for llvm-ar"
        
        # Simply create a shell script wrapper for llvm-ar
        cat > "$LOCAL_BIN_DIR/llvm-ar" << 'EOF'
#!/bin/bash
# Minimal llvm-ar replacement that forwards to system ar
# This does NOT require developer tools
exec /usr/bin/ar "$@"
EOF
        
        chmod +x "$LOCAL_BIN_DIR/llvm-ar"
        log_success "Created minimal llvm-ar wrapper at $LOCAL_BIN_DIR/llvm-ar"
        
        # Show environment variables needed
        log_info "To use system ar for cross-compilation, add these environment variables to your shell:"
        echo -e "\nexport AR=\"/usr/bin/ar\""
        echo -e "export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_MUSL_AR=\"/usr/bin/ar\"\n"
        
        # No verification that requires developer tools
        log_success "No verification needed - basic ar functionality is included in macOS by default"
    else
        log_error "System ar not found at /usr/bin/ar - this is unusual for macOS"
        log_error "Your system may be missing basic utilities"
        exit 1
    fi
else
    log_info "Non-macOS system detected"
    log_warning "This script is primarily designed for macOS"
    
    # For non-macOS, try to find ar
    if [ -f "/usr/bin/ar" ]; then
        cat > "$LOCAL_BIN_DIR/llvm-ar" << 'EOF'
#!/bin/bash
# Minimal llvm-ar replacement
exec /usr/bin/ar "$@"
EOF
        chmod +x "$LOCAL_BIN_DIR/llvm-ar"
        log_success "Created llvm-ar wrapper using system ar"
    else
        log_error "System ar not found at /usr/bin/ar"
        log_error "Please install the basic binutils package for your system"
        exit 1
    fi
fi

# Add export commands to a helper script that can be sourced
cat > "$BACKEND_DIR/ar-setup.sh" << EOF
# Source this file to set up environment variables for cross-compilation
export AR="/usr/bin/ar"
export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_MUSL_AR="/usr/bin/ar"
export PATH="$LOCAL_BIN_DIR:\$PATH"
EOF

log_success "Created helper script at $BACKEND_DIR/ar-setup.sh"

echo -e "\n\033[1;32m=== INSTALLATION COMPLETE ===\033[0m\n"

log_info "Lightweight llvm-ar has been set up at $LOCAL_BIN_DIR/llvm-ar"
log_info "This allows cross-compilation without needing any developer tools"

echo -e "\n\033[1;34mTo use in your current shell:\033[0m"
echo -e "source $BACKEND_DIR/ar-setup.sh"

echo -e "\n\033[1;34mThese variables are also set by set_env.sh:\033[0m"
echo -e "source $SCRIPT_DIR/set_env.sh"

echo -e "\n\033[1;32mDone!\033[0m" 