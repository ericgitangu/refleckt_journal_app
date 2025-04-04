#!/bin/bash
# set-env.sh: Centralized environment settings for Rust Lambda cross-compilation
# This script sets all required environment variables in one place.
# Usage: source ./set-env.sh

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

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

# Detect OpenSSL location in a more flexible manner
if command -v openssl &>/dev/null; then
    # Get the directory of the openssl binary
    OPENSSL_BIN_DIR=$(dirname $(which openssl))
    
    # Set OPENSSL_DIR to the parent directory of the bin directory
    export OPENSSL_DIR=$(dirname "$OPENSSL_BIN_DIR")
    
    echo "OPENSSL_DIR automatically set to $OPENSSL_DIR (detected from $(which openssl))"
else
    # Try common locations for OpenSSL
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
        echo "Warning: Could not detect OpenSSL location automatically."
        echo "Using default OPENSSL_DIR=/usr/local"
        export OPENSSL_DIR="/usr/local"
    fi
    
    echo "OPENSSL_DIR set to $OPENSSL_DIR"
fi

# Use system ar instead of llvm-ar on macOS
if [ "$(uname)" = "Darwin" ]; then
    if [ -f "/usr/bin/ar" ]; then
        export AR="/usr/bin/ar"
        export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_MUSL_AR="/usr/bin/ar"
        echo "Using system ar at /usr/bin/ar for cross-compilation"
    else
        echo "Warning: System ar not found at /usr/bin/ar"
    fi
fi

# Local bin directory (for tools like llvm-ar symlink)
export LOCAL_BIN_DIR="$BACKEND_DIR/.local/bin"

# Add local bin to PATH if it exists
if [ -d "$LOCAL_BIN_DIR" ]; then
    export PATH="$LOCAL_BIN_DIR:$PATH"
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
    echo "Please ensure musl-cross is correctly installed: brew install FiloSottile/musl-cross/musl-cross --with-aarch64"
fi

echo "Environment variables set up for Rust Lambda cross-compilation:"
echo "- TARGET: $TARGET"
echo "- RUST_VERSION: $RUST_VERSION"
echo "- LAMBDA_RUNTIME: $LAMBDA_RUNTIME"
echo "- AWS_LC_SYS_STATIC: $AWS_LC_SYS_STATIC"
echo "- OPENSSL_DIR: $OPENSSL_DIR"
if [ "$(uname)" = "Darwin" ]; then
    echo "- AR: $AR"
fi
if command -v aarch64-linux-musl-gcc &>/dev/null; then
    echo "- MUSL GCC: $(which aarch64-linux-musl-gcc)"
fi
echo "- Additional environment variables set for cross-compilation"