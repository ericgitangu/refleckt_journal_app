#!/bin/bash
# Environment variables for building

# OpenSSL Configuration
export OPENSSL_STATIC=1

# Rust version
export RUSTUP_TOOLCHAIN=1.85.0

# Skip AWS-LC-SYS build - essential for cross-compilation without musl headers
export AWS_LC_SYS_STATIC=1 
export RUSTSEC_IGNORE=1

# Explicitly avoid aws-lc-sys 
export RUSTFLAGS="-C link-arg=-s"

# Check if CARGO_BUILD_RUSTFLAGS is already set
if [ -z "$CARGO_BUILD_RUSTFLAGS" ]; then
    export CARGO_BUILD_RUSTFLAGS="-C target-feature=-crt-static"
fi

# Add a message for diagnostics
echo "setup-env.sh: Environment variables for cross-compilation set up successfully"
echo "setup-env.sh: AWS_LC_SYS_STATIC=$AWS_LC_SYS_STATIC"
echo "setup-env.sh: RUSTUP_TOOLCHAIN=$RUSTUP_TOOLCHAIN"
