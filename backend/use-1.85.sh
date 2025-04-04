#!/bin/bash
# Script to set up the correct Rust 1.85.0 environment for building

# Path to Rust 1.85.0 toolchain
RUST_185=~/.rustup/toolchains/1.85.0-x86_64-apple-darwin/bin

# Set environment variables
export PATH=$RUST_185:$PATH

# Verify version
echo "Using rustc version:"
rustc --version

# Run command with the correct Rust version
exec "$@" 