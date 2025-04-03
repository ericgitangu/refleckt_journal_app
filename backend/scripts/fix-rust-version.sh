#!/bin/bash
# Script to fix Rust version issues

set -e

# Define the target Rust version
TARGET_VERSION="1.85.0"

echo "Fixing Rust version to ${TARGET_VERSION}..."

# Check current versions
echo "Current Rust version: $(rustc --version)"
echo "Expected Rust version: $(rustup run ${TARGET_VERSION} rustc --version)"

# Set the default toolchain
rustup default ${TARGET_VERSION}

# Override the toolchain for the current directory
rustup override set ${TARGET_VERSION}

# Verify PATH is correct
echo "PATH: $PATH"

# Check if active version is now correct
CURRENT_VERSION=$(rustc --version)
echo "Updated Rust version: ${CURRENT_VERSION}"

if [[ "${CURRENT_VERSION}" != *"${TARGET_VERSION}"* ]]; then
    echo "ERROR: Failed to set Rust version to ${TARGET_VERSION}"
    echo "Attempting to diagnose the issue..."
    
    # Check rustup toolchains
    echo "Installed toolchains:"
    rustup toolchain list
    
    # Check which rustc is in PATH
    RUSTC_PATH=$(which rustc)
    echo "rustc path: ${RUSTC_PATH}"
    
    # Try setting RUSTUP_TOOLCHAIN environment variable
    export RUSTUP_TOOLCHAIN=${TARGET_VERSION}
    echo "Set RUSTUP_TOOLCHAIN=${RUSTUP_TOOLCHAIN}"
    echo "Rust version with RUSTUP_TOOLCHAIN: $(rustc --version)"
    
    echo ""
    echo "IMPORTANT: Add this to your shell profile or run before building:"
    echo "export RUSTUP_TOOLCHAIN=${TARGET_VERSION}"
    exit 1
else
    echo "SUCCESS: Rust version set to ${TARGET_VERSION}"
    echo ""
    echo "You can now build the project with:"
    echo "cd backend && ./scripts/build-all.sh"
fi 