# Makefile for journal-authorizer Lambda function
.PHONY: all build test clean package verify-lambda deploy

# Service name
SERVICE_NAME := journal-authorizer

# Build directories
BUILD_DIR := ./target/lambda/$(SERVICE_NAME)
PACKAGE_DIR := ./target/lambda

# AWS Region for deployment
AWS_REGION ?= us-east-1

# Common library path
COMMON_PATH := ../common

# All encompasses build, package, and verify
all: package verify-lambda

# Ensure the common library is built first
build-common:
	@echo "Building common library..."
	$(MAKE) -C $(COMMON_PATH) build

# Build the service
build: build-common
	@echo "Building $(SERVICE_NAME)..."
	@if command -v cargo lambda >/dev/null 2>&1; then \
		echo "Using cargo-lambda for build..."; \
		RUSTFLAGS="-C target-feature=+crt-static" cargo lambda build --release --output-format zip; \
	else \
		echo "cargo-lambda not found. Installing..."; \
		cargo install cargo-lambda && \
		RUSTFLAGS="-C target-feature=+crt-static" cargo lambda build --release --output-format zip; \
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

# Package Lambda function with bootstrap
package: build
	@echo "Packaging $(SERVICE_NAME) for AWS Lambda deployment..."
	mkdir -p $(PACKAGE_DIR)
	cp target/lambda/$(SERVICE_NAME).zip $(PACKAGE_DIR)/$(SERVICE_NAME).zip
	@echo "✅ Lambda deployment package created at $(PACKAGE_DIR)/$(SERVICE_NAME).zip"

# Verify the Lambda package is valid
verify-lambda:
	@echo "Verifying Lambda package..."
	@if [ -f "$(PACKAGE_DIR)/$(SERVICE_NAME).zip" ]; then \
		echo "✅ Lambda package exists"; \
	else \
		echo "❌ Lambda package is missing"; \
		exit 1; \
	fi
	@echo "✅ Lambda package verified successfully"

# Deploy the Lambda function
deploy: package verify-lambda
	@echo "Deploying $(SERVICE_NAME) to AWS Lambda..."
	aws lambda update-function-code \
		--function-name $(SERVICE_NAME) \
		--zip-file fileb://$(PACKAGE_DIR)/$(SERVICE_NAME).zip \
		--region $(AWS_REGION)
	@echo "✅ Lambda function $(SERVICE_NAME) deployed successfully" 