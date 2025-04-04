#!/bin/bash
# set-env.sh: Centralized environment settings for Rust Lambda cross-compilation
# This script sets all required environment variables in one place.
# Usage: source ./set-env.sh

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

# Set up local bin directory variables for cross-script compatibility
export LOCAL_BIN_DIR="$BACKEND_DIR/.local/bin"
export LOCAL_BIN="$LOCAL_BIN_DIR"
echo "Setting LOCAL_BIN_DIR and LOCAL_BIN to: $LOCAL_BIN_DIR"

# Detect OS type
OS_TYPE="$(uname -s | tr '[:upper:]' '[:lower:]')"
echo "Detected OS: $OS_TYPE"

# Check if running in WSL
if grep -q Microsoft /proc/version 2>/dev/null || grep -q WSL /proc/version 2>/dev/null; then
    WSL_DETECTED=true
    echo "WSL environment detected, applying WSL-specific settings"
else
    WSL_DETECTED=false
fi

# Rust version to use
export RUST_VERSION=${RUST_VERSION:-"1.85.0"}

# Default target for Lambda compilation
export TARGET=${TARGET:-"aarch64-unknown-linux-musl"}

# Lambda runtime
export LAMBDA_RUNTIME=${LAMBDA_RUNTIME:-"provided.al2023"}

# Set environment variables to avoid aws-lc-sys/ring compilation issues
export AWS_LC_SYS_STATIC=1
export AWS_LC_SYS_VENDORED=1
export RUSTSEC_IGNORE=1
export OPENSSL_STATIC=1
export OPENSSL_NO_VENDOR=1

# Enhanced OpenSSL detection for all environments including WSL
detect_openssl_dir() {
    # First check for common header locations
    for dir in "/usr/include/openssl" "/usr/local/include/openssl" "/usr/local/opt/openssl/include/openssl" "/opt/homebrew/opt/openssl@3/include/openssl"; do
        if [ -d "$dir" ]; then
            echo "$(dirname "$dir")"
            return 0
        fi
    done
    
    # Check using openssl executable
    if command -v openssl &>/dev/null; then
        # Try to get version info and extract from there
        local openssl_version_path=$(openssl version -d | cut -d' ' -f2 | tr -d '"')
        if [ -d "$openssl_version_path/include/openssl" ]; then
            echo "$openssl_version_path"
            return 0
        fi
        
        # Get the directory of the openssl binary
        local openssl_bin_dir=$(dirname $(which openssl))
        # Set OPENSSL_DIR to the parent directory of the bin directory
        local parent_dir=$(dirname "$openssl_bin_dir")
        
        if [ -d "$parent_dir/include/openssl" ]; then
            echo "$parent_dir"
            return 0
        fi
    fi
    
    # OS-specific fallbacks
    if [ "$OS_TYPE" = "darwin" ]; then
        # macOS Homebrew common locations
        for dir in "/usr/local/opt/openssl@3" "/usr/local/opt/openssl@1.1" "/opt/homebrew/opt/openssl@3" "/opt/homebrew/opt/openssl@1.1"; do
            if [ -d "$dir" ]; then
                echo "$dir"
                return 0
            fi
        done
        echo "/usr/local"  # Default fallback for macOS
    else
        # Linux standard locations
        if [ -d "/usr/include/openssl" ]; then
            echo "/usr"
            return 0
        elif [ -d "/usr/local/include/openssl" ]; then
            echo "/usr/local"
            return 0
        fi
        echo "/usr"  # Default fallback for Linux
    fi
}

# For WSL, make sure libssl-dev is installed
if [ "$WSL_DETECTED" = true ]; then
    if [ ! -f "/usr/include/openssl/opensslconf.h" ] && [ ! -f "/usr/local/include/openssl/opensslconf.h" ]; then
        echo "WARNING: OpenSSL development headers not found in WSL environment."
        echo "Run 'sudo apt-get update && sudo apt-get install -y libssl-dev' to install them."
    fi
fi

# Set OPENSSL_DIR based on our enhanced detection
export OPENSSL_DIR=$(detect_openssl_dir)
echo "OPENSSL_DIR set to $OPENSSL_DIR"

# Handle system ar and cross-compiler differently based on OS
if [ "$OS_TYPE" = "darwin" ]; then
    # macOS-specific handling
    
    # Use system ar instead of llvm-ar on macOS
    if [ -f "/usr/bin/ar" ]; then
        export AR="/usr/bin/ar"
        export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_MUSL_AR="/usr/bin/ar"
        echo "Using system ar at /usr/bin/ar for cross-compilation on macOS"
    else
        echo "Warning: System ar not found at /usr/bin/ar"
    fi

    # Find musl-cross using brew as first option
    if command -v brew &>/dev/null; then
        MUSL_CROSS_PREFIX=$(brew --prefix musl-cross 2>/dev/null || echo "")
        if [ -n "$MUSL_CROSS_PREFIX" ] && [ -d "$MUSL_CROSS_PREFIX/bin" ]; then
            # Add musl-cross bin directory from brew to PATH
            if [[ ":$PATH:" != *":$MUSL_CROSS_PREFIX/bin:"* ]]; then
                export PATH="$MUSL_CROSS_PREFIX/bin:$PATH"
                echo "Added musl-cross bin directory from brew to PATH: $MUSL_CROSS_PREFIX/bin"
            fi
            
            # Verify aarch64-linux-musl-gcc is present
            if [ -x "$MUSL_CROSS_PREFIX/bin/aarch64-linux-musl-gcc" ]; then
                echo "Found aarch64-linux-musl-gcc at $MUSL_CROSS_PREFIX/bin/aarch64-linux-musl-gcc"
                # Set the C compiler for the target explicitly
                export CC_aarch64_unknown_linux_musl="$MUSL_CROSS_PREFIX/bin/aarch64-linux-musl-gcc"
                export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_MUSL_LINKER="$MUSL_CROSS_PREFIX/bin/aarch64-linux-musl-gcc"
            else
                echo "Warning: musl-cross is installed but aarch64-linux-musl-gcc not found at $MUSL_CROSS_PREFIX/bin"
            fi
        fi
    fi

    # Add musl-cross to PATH if it exists in standard locations (fallback)
    if ! command -v aarch64-linux-musl-gcc &>/dev/null; then
        # Try standard locations if not found in PATH
        if [ -d "/usr/local/opt/musl-cross/bin" ]; then
            export PATH="/usr/local/opt/musl-cross/bin:$PATH"
            echo "Added standard musl-cross bin directory to PATH: /usr/local/opt/musl-cross/bin"
        elif [ -d "/opt/homebrew/opt/musl-cross/bin" ]; then
            export PATH="/opt/homebrew/opt/musl-cross/bin:$PATH"
            echo "Added standard musl-cross bin directory to PATH: /opt/homebrew/opt/musl-cross/bin"
        fi
    fi
    
elif [ "$OS_TYPE" = "linux" ]; then
    # Linux-specific handling
    
    # Check for native aarch64 compiler first
    if [ -x "/usr/bin/aarch64-linux-gnu-gcc" ]; then
        echo "Found native aarch64-linux-gnu-gcc compiler"
        export CC_aarch64_unknown_linux_musl="/usr/bin/aarch64-linux-gnu-gcc"
        export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_MUSL_LINKER="/usr/bin/aarch64-linux-gnu-gcc"
    fi
    
    # Check various distribution-specific paths for musl tools
    if [ -x "/usr/bin/musl-gcc" ]; then
        echo "Found musl-gcc at /usr/bin/musl-gcc"
    elif [ -x "/usr/bin/aarch64-linux-musl-gcc" ]; then
        echo "Found aarch64-linux-musl-gcc at /usr/bin/aarch64-linux-musl-gcc"
        export CC_aarch64_unknown_linux_musl="/usr/bin/aarch64-linux-musl-gcc"
        export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_MUSL_LINKER="/usr/bin/aarch64-linux-musl-gcc"
    fi
    
    # Use system ar on Linux
    if [ -x "/usr/bin/ar" ]; then
        export AR="/usr/bin/ar"
        export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_MUSL_AR="/usr/bin/ar"
        echo "Using system ar at /usr/bin/ar for cross-compilation on Linux"
    fi
fi

# Set RUSTUP_TOOLCHAIN environment variable
export RUSTUP_TOOLCHAIN="${RUST_VERSION}"

# Add rustup bin to PATH
RUSTUP_TOOLCHAIN_BIN=$(rustup which --toolchain "$RUST_VERSION" rustc 2>/dev/null || echo "")
if [ -n "$RUSTUP_TOOLCHAIN_BIN" ]; then
    RUSTUP_TOOLCHAIN_BIN=$(dirname "$RUSTUP_TOOLCHAIN_BIN")
    export PATH="$RUSTUP_TOOLCHAIN_BIN:$PATH"
fi

# Final check for musl compiler and print warning if not found
if ! command -v aarch64-linux-musl-gcc &>/dev/null; then
    echo "Warning: aarch64-linux-musl-gcc not found in PATH after setup attempts"
    if [ "$OS_TYPE" = "darwin" ]; then
        echo "Please ensure musl-cross is correctly installed: brew install FiloSottile/musl-cross/musl-cross --with-aarch64"
    elif [ "$OS_TYPE" = "linux" ]; then
        echo "Please install the appropriate cross-compilation tools for your distribution:"
        echo "  Debian/Ubuntu: sudo apt-get install musl-tools gcc-aarch64-linux-gnu"
        echo "  Fedora/RHEL: sudo dnf install musl-gcc aarch64-linux-gnu-gcc"
    fi
fi

echo "Environment variables set up for Rust Lambda cross-compilation:"
echo "- TARGET: $TARGET"
echo "- RUST_VERSION: $RUST_VERSION"
echo "- LAMBDA_RUNTIME: $LAMBDA_RUNTIME"
echo "- AWS_LC_SYS_STATIC: $AWS_LC_SYS_STATIC"
echo "- OPENSSL_DIR: $OPENSSL_DIR"
echo "- OS_TYPE: $OS_TYPE"
if [ -n "$AR" ]; then
    echo "- AR: $AR"
fi
if command -v aarch64-linux-musl-gcc &>/dev/null; then
    echo "- MUSL GCC: $(which aarch64-linux-musl-gcc)"
fi
echo "- Additional environment variables set for cross-compilation"