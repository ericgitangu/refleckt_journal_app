# Makefile for journal-common library
.PHONY: all build test clean build-musl setup-cross

# Library name
LIB_NAME := journal-common

# Cross-compilation settings
TARGET ?= aarch64-unknown-linux-musl

# Build profile
PROFILE ?= release

# Add appropriate environment variables for cross-compilation
export AWS_LC_SYS_STATIC=1
export AWS_LC_SYS_VENDORED=1
export RUSTSEC_IGNORE=1
export OPENSSL_STATIC=1
export OPENSSL_NO_VENDOR=1
export CARGO_FEATURES=openssl,ring/force-openssl

# All encompasses build and test
all: build-musl

# Setup cross-compilation environment
setup-cross:
	@echo "Setting up cross-compilation environment..."
	@rustup target add $(TARGET)
	@echo "✅ Cross-compilation environment set up for $(TARGET)"

# Build the common library
build:
	@echo "Building $(LIB_NAME)..."
	cargo build --$(PROFILE)
	@echo "✅ $(LIB_NAME) built successfully"

# Build with musl for Lambda compatibility
build-musl: setup-cross
	@echo "Building $(LIB_NAME) for Lambda compatibility with target $(TARGET)..."
	@echo "Using standard cargo for cross-compilation..."
	@AWS_LC_SYS_STATIC=1 AWS_LC_SYS_VENDORED=1 RUSTSEC_IGNORE=1 OPENSSL_STATIC=1 OPENSSL_NO_VENDOR=1 cargo build --target $(TARGET) --release --features=openssl
	@echo "✅ $(LIB_NAME) built successfully for Lambda"

# Run tests
test:
	@echo "Testing $(LIB_NAME)..."
	cargo test
	@echo "✅ Tests completed"

# Clean build artifacts
clean:
	@echo "Cleaning $(LIB_NAME)..."
	cargo clean
	@echo "✅ Clean completed"