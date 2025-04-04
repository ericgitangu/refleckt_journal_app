#!/bin/bash
# set-env.sh: Centralized environment settings for Rust Lambda cross-compilation
# This script sets all required environment variables in one place.
# Usage: source ./set-env.sh

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

# Detect OS type
OS_TYPE="$(uname -s | tr '[:upper:]' '[:lower:]')"
echo "Detected OS: $OS_TYPE"

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

# Detect OpenSSL location in a more flexible manner based on OS
if command -v openssl &>/dev/null; then
    # Get the directory of the openssl binary
    OPENSSL_BIN_DIR=$(dirname $(which openssl))
    
    # Set OPENSSL_DIR to the parent directory of the bin directory
    export OPENSSL_DIR=$(dirname "$OPENSSL_BIN_DIR")
    
    echo "OPENSSL_DIR automatically set to $OPENSSL_DIR (detected from $(which openssl))"
else
    # Platform-specific OpenSSL locations
    if [ "$OS_TYPE" = "darwin" ]; then
        # macOS Homebrew locations
        if [ -d "/usr/local/opt/openssl@3" ]; then
            export OPENSSL_DIR="/usr/local/opt/openssl@3"
        elif [ -d "/usr/local/opt/openssl@1.1" ]; then
            export OPENSSL_DIR="/usr/local/opt/openssl@1.1"
        elif [ -d "/opt/homebrew/opt/openssl@3" ]; then
            export OPENSSL_DIR="/opt/homebrew/opt/openssl@3"
        elif [ -d "/opt/homebrew/opt/openssl@1.1" ]; then
            export OPENSSL_DIR="/opt/homebrew/opt/openssl@1.1"
        elif [ -d "/usr/local" ]; then
            # Default OpenSSL location on macOS with Homebrew
            export OPENSSL_DIR="/usr/local"
        else
            echo "Warning: Could not detect OpenSSL location automatically on macOS."
            echo "Using default OPENSSL_DIR=/usr/local"
            export OPENSSL_DIR="/usr/local"
        fi
    elif [ "$OS_TYPE" = "linux" ]; then
        # Linux standard locations
        if [ -d "/usr/include/openssl" ]; then
            export OPENSSL_DIR="/usr"
        elif [ -d "/usr/local/include/openssl" ]; then
            export OPENSSL_DIR="/usr/local"
        else
            echo "Warning: Could not detect OpenSSL location automatically on Linux."
            echo "Using default OPENSSL_DIR=/usr"
            export OPENSSL_DIR="/usr"
        fi
    else
        # Default fallback
        echo "Warning: Unknown OS type $OS_TYPE. Using default OpenSSL location."
        export OPENSSL_DIR="/usr"
    fi
    
    echo "OPENSSL_DIR set to $OPENSSL_DIR"
fi

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