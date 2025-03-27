# Makefile for journal-common library
.PHONY: all build test clean build-musl setup-cross

# Library name
LIB_NAME := journal-common

# Variables for ARM64 Lambda build
TARGET := aarch64-unknown-linux-musl
CROSS_TOOLCHAIN := /usr/local/opt/$(TARGET)

# Build profile
PROFILE ?= release

# Setup cross-compilation environment
setup-cross:
	@echo "Setting up cross-compilation environment..."
	@if [ "$$(uname)" = "Darwin" ]; then \
		echo "macOS system detected, setting up cross-compilation toolchain..."; \
		if ! brew tap | grep -q "messense/macos-cross-toolchains"; then \
			echo "Adding messense/macos-cross-toolchains tap..." && \
			brew tap messense/macos-cross-toolchains; \
		fi; \
		if ! brew list messense/macos-cross-toolchains/$(TARGET) >/dev/null 2>&1; then \
			echo "Installing cross-compilation toolchain..." && \
			brew install messense/macos-cross-toolchains/$(TARGET); \
		fi \
	else \
		echo "Linux system detected, using native toolchain..."; \
	fi
	@rustup target add $(TARGET)

# Build the common library
build:
	@echo "Building $(LIB_NAME)..."
	cargo build --$(PROFILE)
	@echo "✅ $(LIB_NAME) built successfully"

# Build with musl for Lambda compatibility
build-musl: setup-cross
	@echo "Building $(LIB_NAME) for Lambda compatibility..."
	@if [ "$$(uname)" = "Darwin" ]; then \
		echo "Using macOS cross-compilation toolchain..."; \
		RUSTFLAGS="-C linker=$(CROSS_TOOLCHAIN)/bin/aarch64-unknown-linux-musl-gcc" \
		CC_aarch64_unknown_linux_musl=$(CROSS_TOOLCHAIN)/bin/aarch64-unknown-linux-musl-gcc \
		CXX_aarch64_unknown_linux_musl=$(CROSS_TOOLCHAIN)/bin/aarch64-unknown-linux-musl-g++ \
		cargo build --target $(TARGET) --release; \
	else \
		echo "Using direct build on Linux..."; \
		cargo build --target $(TARGET) --release; \
	fi
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

# Default target
all: build-musl