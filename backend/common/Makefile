# Makefile for journal-common library
.PHONY: all build test clean build-musl setup-cross

# Library name
LIB_NAME := journal-common

# Cross-compilation settings
TARGET ?= aarch64-unknown-linux-musl

# Build profile
PROFILE ?= release

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
	@cargo build --target $(TARGET) --release
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