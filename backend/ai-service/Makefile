# Makefile for journal-ai-service Lambda function
.PHONY: all build test clean package verify-lambda deploy setup-cross

# Service name
SERVICE_NAME := journal-ai-service

# Variables for ARM64 Lambda build
TARGET := aarch64-unknown-linux-musl
CROSS_TOOLCHAIN := /usr/local/opt/$(TARGET)
BUILD_DIR := ./target/$(TARGET)/release
PACKAGE_DIR := ./target/lambda

# AWS Region for deployment
AWS_REGION ?= us-east-1

# Common library path
COMMON_PATH := ../common

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

# All encompasses build, package, and verify
all: package verify-lambda

# Ensure the common library is built first
build-common:
	@echo "Building common library..."
	$(MAKE) -C $(COMMON_PATH) build-musl

# Build the service
build: setup-cross build-common
	@echo "Building $(SERVICE_NAME)..."
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
	@echo "✅ $(SERVICE_NAME) built successfully"

# Run tests
test:
	@echo "Testing $(SERVICE_NAME)..."
	cargo test
	@echo "✅ Tests completed"

# Clean build artifacts
clean:
	@echo "Cleaning $(SERVICE_NAME)..."
	cargo clean
	rm -rf $(PACKAGE_DIR)
	@echo "✅ Clean completed"

# Package Lambda function
package: build
	@echo "Packaging $(SERVICE_NAME) for AWS Lambda deployment..."
	mkdir -p $(PACKAGE_DIR)
	cp $(BUILD_DIR)/$(SERVICE_NAME) $(PACKAGE_DIR)/bootstrap
	chmod +x $(PACKAGE_DIR)/bootstrap
	cd $(PACKAGE_DIR) && zip -r ../$(SERVICE_NAME).zip bootstrap
	@echo "✅ Lambda deployment package created at target/$(SERVICE_NAME).zip"

# Verify the Lambda package is valid
verify-lambda:
	@echo "Verifying Lambda package..."
	@if [ -f "$(PACKAGE_DIR)/bootstrap" ] && [ -x "$(PACKAGE_DIR)/bootstrap" ]; then \
		echo "✅ Bootstrap file exists and is executable"; \
	else \
		echo "❌ Bootstrap file is missing or not executable"; \
		exit 1; \
	fi
	@echo "✅ Lambda package verified successfully"

# Deploy the Lambda function
deploy: package verify-lambda
	@echo "Deploying $(SERVICE_NAME) to AWS Lambda..."
	aws lambda update-function-code \
		--function-name $(SERVICE_NAME) \
		--zip-file fileb://target/$(SERVICE_NAME).zip \
		--region $(AWS_REGION)
	@echo "✅ Lambda function $(SERVICE_NAME) deployed successfully" 