#!/bin/bash
# Cross-compilation utility for AWS Lambda functions
# This script provides a unified approach for building Lambda functions
# that avoids issues with cargo-lambda and aws-lc-sys

set -e

# Default values
TARGET=${TARGET:-aarch64-unknown-linux-musl}
RUSTUP_TOOLCHAIN=${RUSTUP_TOOLCHAIN:-1.85.0}
SERVICE_NAME=$1
OUTPUT_DIR=${2:-"./target/lambda"}
PROFILE=${PROFILE:-release}

# Check if the service name is provided
if [ -z "$SERVICE_NAME" ]; then
    echo "Error: Service name is required."
    echo "Usage: $0 <service-name> [output-dir]"
    exit 1
fi

# Setup cross-compilation
echo "Setting up cross-compilation environment for $TARGET using Rust $RUSTUP_TOOLCHAIN..."
rustup target add --toolchain $RUSTUP_TOOLCHAIN $TARGET

# Check if the service has aws-lc-sys as a dependency
if grep -q "aws-lc-sys" Cargo.lock 2>/dev/null || grep -q "lambda_runtime" Cargo.toml 2>/dev/null; then
    echo "⚠️  Detected potential aws-lc-sys dependency. Using standard cargo for cross-compilation..."
    USE_CARGO_LAMBDA=false
else
    # Check if cargo-lambda is available
    if command -v cargo-lambda &>/dev/null; then
        echo "Using cargo-lambda for cross-compilation..."
        USE_CARGO_LAMBDA=true
    else
        echo "cargo-lambda not found. Using standard cargo for cross-compilation..."
        USE_CARGO_LAMBDA=false
    fi
fi

# Build the service
if [ "$USE_CARGO_LAMBDA" = true ]; then
    # Build with cargo-lambda
    echo "Building with cargo-lambda..."
    rustup run $RUSTUP_TOOLCHAIN cargo lambda build --target $TARGET --release --output-format zip
    
    # Copy the zip file to the output directory
    mkdir -p "$OUTPUT_DIR"
    if [ -f "target/lambda/${SERVICE_NAME}.zip" ]; then
        cp "target/lambda/${SERVICE_NAME}.zip" "${OUTPUT_DIR}/${SERVICE_NAME}.zip"
        echo "✅ ${SERVICE_NAME} built and packaged successfully with cargo-lambda"
    else
        echo "❌ cargo-lambda build failed to create zip package"
        exit 1
    fi
else
    # Build with standard cargo
    echo "Building with standard cargo..."
    rustup run $RUSTUP_TOOLCHAIN cargo build --target $TARGET --$PROFILE
    
    # Create bootstrap file
    mkdir -p "$OUTPUT_DIR"
    cp "target/${TARGET}/${PROFILE}/${SERVICE_NAME}" "${OUTPUT_DIR}/bootstrap"
    chmod +x "${OUTPUT_DIR}/bootstrap"
    
    # Create zip package
    cd "$OUTPUT_DIR" && zip -j "../${SERVICE_NAME}.zip" bootstrap
    echo "✅ ${SERVICE_NAME} built and packaged successfully with standard cargo"
fi

echo "Lambda package created at target/${SERVICE_NAME}.zip" 