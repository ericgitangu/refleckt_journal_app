#!/bin/bash
# install-llvm-ar.sh: Truly lightweight llvm-ar installation for cross-compilation
# This script creates a minimal llvm-ar replacement using only system tools
# WITHOUT requiring any developer tools installation

set -e

# Script constants
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
LOCAL_BIN_DIR="$BACKEND_DIR/.local/bin"

# Source the common utilities
if [ -f "$SCRIPT_DIR/common.sh" ]; then
    source "$SCRIPT_DIR/common.sh"
elif [ -f "$SCRIPT_DIR/utils.sh" ]; then
    source "$SCRIPT_DIR/utils.sh"
else
    # Minimal logging if utils are not found
    log_info() { echo "[INFO] $*"; }
    log_success() { echo "[SUCCESS] $*"; }
    log_error() { echo "[ERROR] $*"; }
    log_warning() { echo "[WARNING] $*"; }
fi

log_info "=== INSTALLING LIGHTWEIGHT LLVM-AR (NO DEVELOPER TOOLS REQUIRED) ==="

# Verify directory paths are valid
if [ -z "$LOCAL_BIN_DIR" ]; then
    log_error "LOCAL_BIN_DIR is empty. Cannot proceed."
    exit 1
fi

# Create local bin directory with explicit error handling
log_info "Creating local bin directory at: $LOCAL_BIN_DIR"
if ! mkdir -p "$LOCAL_BIN_DIR"; then
    log_error "Failed to create directory: $LOCAL_BIN_DIR"
    log_error "Check file permissions and path validity"
    exit 1
fi

# Detect OS type
OS_TYPE="$(uname -s | tr '[:upper:]' '[:lower:]')"
log_info "$OS_TYPE detected"

# Check if we're on macOS 
if [ "$OS_TYPE" = "darwin" ]; then
    log_info "macOS system detected"
    
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
    log_info "Linux system detected"
    
    # For Linux, try to find ar in standard locations
    AR_PATH=""
    for path in "/usr/bin/ar" "/bin/ar" "/usr/local/bin/ar"; do
        if [ -f "$path" ]; then
            AR_PATH="$path"
            break
        fi
    done
    
    if [ -n "$AR_PATH" ]; then
        log_info "Using system ar at $AR_PATH"
        
        cat > "$LOCAL_BIN_DIR/llvm-ar" << EOF
#!/bin/bash
# Minimal llvm-ar replacement for Linux
exec $AR_PATH "\$@"
EOF
        chmod +x "$LOCAL_BIN_DIR/llvm-ar"
        log_success "Created llvm-ar wrapper using system ar at $AR_PATH"
    else
        log_error "System ar not found in standard locations"
        log_error "Please install binutils: sudo apt-get install binutils (Debian/Ubuntu)"
        log_error "or: sudo dnf install binutils (Fedora/RHEL)"
        exit 1
    fi
fi

# Add export commands to a helper script that can be sourced
AR_PATH=${AR_PATH:-"/usr/bin/ar"}
HELPER_SCRIPT="$BACKEND_DIR/ar-setup.sh"

log_info "Creating helper script at $HELPER_SCRIPT"
cat > "$HELPER_SCRIPT" << EOF
# Source this file to set up environment variables for cross-compilation
export AR="$AR_PATH"
export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_MUSL_AR="$AR_PATH"
export PATH="$LOCAL_BIN_DIR:\$PATH"
EOF

log_success "Created helper script at $HELPER_SCRIPT"

log_info "Lightweight llvm-ar has been set up at $LOCAL_BIN_DIR/llvm-ar"
log_info "This allows cross-compilation without needing any developer tools"

log_info "To use in your current shell:"
log_info "source $HELPER_SCRIPT"

log_info "These variables are also set by set_env.sh:"
log_info "source $SCRIPT_DIR/set_env.sh"

log_success "Done!" 