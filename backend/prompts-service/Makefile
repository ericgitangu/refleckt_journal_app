# Makefile for journal-prompts-service Lambda function
.PHONY: all build test clean release package verify-lambda

# Service name
SERVICE_NAME := journal-prompts-service

# Default target architecture for AWS Lambda
ARCH ?= x86_64-unknown-linux-musl

# Default build profile
PROFILE ?= release

# Build directory
BUILD_DIR := ./target/$(ARCH)/$(PROFILE)

# Deployment package directory
PACKAGE_DIR := ./target/lambda

# AWS Region for deployment
AWS_REGION ?= us-east-1

# Common library path
COMMON_PATH := ../common

# Check for cargo-lambda
CARGO_LAMBDA := $(shell command -v cargo lambda 2> /dev/null)

# All encompasses build, package, and verify
all: package verify-lambda

# Ensure the common library is built first
build-common:
	@echo "Building common library..."
	$(MAKE) -C $(COMMON_PATH) build-musl

# Build the service
build: build-common
	@echo "Building $(SERVICE_NAME)..."
ifdef CARGO_LAMBDA
	cargo lambda build --release --arm64
else
	cargo build --target $(ARCH) --$(PROFILE)
endif

# Run tests
test:
	cargo test

# Clean build artifacts
clean:
	cargo clean
	rm -rf $(PACKAGE_DIR)

# Package Lambda function with bootstrap
package: build
	@echo "Packaging $(SERVICE_NAME) for AWS Lambda deployment..."
	mkdir -p $(PACKAGE_DIR)
ifdef CARGO_LAMBDA
	cp ./target/lambda/$(SERVICE_NAME)/bootstrap $(PACKAGE_DIR)/bootstrap
else
	cp $(BUILD_DIR)/$(SERVICE_NAME) $(PACKAGE_DIR)/bootstrap
endif
	cd $(PACKAGE_DIR) && chmod +x bootstrap && zip -r ../$(SERVICE_NAME).zip bootstrap
	@echo "Lambda deployment package created at target/$(SERVICE_NAME).zip"

# Verify the Lambda package is valid
verify-lambda: package
	@echo "Verifying Lambda package..."
	@if [ -f "$(PACKAGE_DIR)/bootstrap" ] && [ -x "$(PACKAGE_DIR)/bootstrap" ]; then \
		echo "✅ Bootstrap file exists and is executable"; \
	else \
		echo "❌ Bootstrap file is missing or not executable"; \
		exit 1; \
	fi
	@echo "✅ Lambda package verified successfully"

# Deploy the Lambda function
deploy: package
	@echo "Deploying $(SERVICE_NAME) to AWS Lambda..."
	aws lambda update-function-code \
		--function-name $(SERVICE_NAME) \
		--zip-file fileb://target/$(SERVICE_NAME).zip \
		--region $(AWS_REGION)
	@echo "Lambda function $(SERVICE_NAME) deployed successfully" 