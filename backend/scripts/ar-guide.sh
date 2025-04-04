#!/bin/bash
# Ultra-lightweight approach to use system ar for cross-compilation
# NO file creation, NO developer tools needed!

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

# Source the utils
source "$SCRIPT_DIR/common.sh"

# Check for system ar
check_system_ar() {
    log_info "Checking for system ar at /usr/bin/ar..."
    
    if [ -f "/usr/bin/ar" ]; then
        log_success "Found system ar at /usr/bin/ar"
        return 0
    else
        log_error "System ar not found at /usr/bin/ar"
        log_error "This is unusual for macOS"
        return 1
    fi
}

print_banner "USING SYSTEM AR FOR CROSS-COMPILATION"

log_info "• The build system now directly uses environment variables to tell Cargo to use the system ar"
log_info "• No need to install llvm or other developer tools"
log_info "• All scripts have been updated to use this approach"
echo ""

if check_system_ar; then
    log_success "This is automatically used by set_env.sh"
    
    echo ""
    log_info "These variables are set automatically:"
    echo "  export AR=\"/usr/bin/ar\""
    echo "  export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_MUSL_AR=\"/usr/bin/ar\""
    echo ""
    
    log_success "Just run 'source ./scripts/set_env.sh' before building"
    log_success "The build-all.sh and init.sh scripts do this automatically"
fi

print_banner "NO INSTALLATION REQUIRED!"
