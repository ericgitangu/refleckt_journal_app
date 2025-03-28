#!/bin/bash
# Environment setup for aarch64-unknown-linux-musl builds
export PATH="/Users/egitangu/Development/refleckt_journal_app/backend/.local/bin:$PATH"
export CC_aarch64_unknown_linux_musl=clang
export AR_aarch64_unknown_linux_musl=llvm-ar
export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_MUSL_RUSTFLAGS="-Clink-self-contained=yes -Clinker=rust-lld"
