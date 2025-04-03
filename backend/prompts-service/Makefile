# Makefile for journal prompts-service Lambda functions
.PHONY: all build test clean package verify-lambda deploy setup-cross build-musl

# Service name - customize for each service
SERVICE_NAME := journal-prompts-service

# Build directories
BUILD_DIR := ./target/lambda/$(SERVICE_NAME)
PACKAGE_DIR := ./target/lambda

# AWS Region for deployment
AWS_REGION ?= us-east-1

# Common library path
COMMON_PATH := ../common

# Cross-compilation settings
TARGET ?= aarch64-unknown-linux-musl

# Build profile
PROFILE ?= release

# All encompasses build, package, and verify
all: package verify-lambda

# Setup cross-compilation environment
setup-cross:
	@echo "Setting up cross-compilation environment..."
	@rustup target add $(TARGET)
	@echo "✅ Cross-compilation environment set up for $(TARGET)"

# Ensure the common library is built first
build-common:
	@echo "Building common library..."
	@if [ -f "$(COMMON_PATH)/Makefile" ]; then \
		$(MAKE) -C $(COMMON_PATH) build-musl TARGET=$(TARGET); \
	else \
		cd $(COMMON_PATH) && cargo build --target $(TARGET) --release && cd -; \
	fi

# Build the service
build: build-common
	@echo "Building $(SERVICE_NAME)..."
	@if command -v cargo-lambda &> /dev/null; then \
		echo "Using cargo-lambda for build..."; \
		cargo lambda build --release --output-format zip; \
	else \
		echo "Using standard cargo for build..."; \
		cargo build --release; \
	fi
	@echo "✅ $(SERVICE_NAME) built successfully"

# Build with musl for Lambda compatibility
build-musl: setup-cross build-common
	@echo "Building $(SERVICE_NAME) for Lambda compatibility with target $(TARGET)..."
	@if command -v cargo-lambda &> /dev/null; then \
		echo "Using cargo-lambda for cross-compilation..."; \
		cargo lambda build --target $(TARGET) --release --output-format zip; \
	else \
		echo "Using standard cargo for cross-compilation..."; \
		cargo build --target $(TARGET) --release; \
	fi
	@echo "✅ $(SERVICE_NAME) built successfully for Lambda"

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
package: build-musl
	@echo "Packaging $(SERVICE_NAME) for AWS Lambda deployment..."
	@mkdir -p $(PACKAGE_DIR)
	@if command -v cargo-lambda &> /dev/null && [ -f "target/lambda/$(SERVICE_NAME).zip" ]; then \
		echo "Using cargo-lambda zip package..."; \
		cp target/lambda/$(SERVICE_NAME).zip $(PACKAGE_DIR)/$(SERVICE_NAME).zip; \
	else \
		echo "Creating bootstrap package..."; \
		cp target/$(TARGET)/release/$(SERVICE_NAME) $(PACKAGE_DIR)/bootstrap || cp target/release/$(SERVICE_NAME) $(PACKAGE_DIR)/bootstrap; \
		chmod +x $(PACKAGE_DIR)/bootstrap; \
		cd $(PACKAGE_DIR) && zip -j ../$(SERVICE_NAME).zip bootstrap; \
	fi
	@echo "✅ Lambda deployment package created at target/$(SERVICE_NAME).zip"

# Verify the Lambda package is valid
verify-lambda:
	@echo "Verifying Lambda package..."
	@if [ -f "target/$(SERVICE_NAME).zip" ]; then \
		echo "✅ Lambda package exists"; \
	elif [ -f "$(PACKAGE_DIR)/$(SERVICE_NAME).zip" ]; then \
		echo "✅ Lambda package exists in package directory"; \
	elif [ -f "$(PACKAGE_DIR)/bootstrap" ] && [ -x "$(PACKAGE_DIR)/bootstrap" ]; then \
		echo "✅ Bootstrap file exists and is executable"; \
		cd $(PACKAGE_DIR) && zip -j ../$(SERVICE_NAME).zip bootstrap; \
		echo "✅ Created Lambda package from bootstrap"; \
	else \
		echo "❌ Lambda package or bootstrap is missing"; \
		exit 1; \
	fi
	@echo "✅ Lambda package verified successfully"

# Deploy the Lambda function
deploy: package verify-lambda
	@echo "Deploying $(SERVICE_NAME) to AWS Lambda..."
	@if [ -f "target/$(SERVICE_NAME).zip" ]; then \
		aws lambda update-function-code \
			--function-name $(SERVICE_NAME) \
			--zip-file fileb://target/$(SERVICE_NAME).zip \
			--region $(AWS_REGION); \
	elif [ -f "$(PACKAGE_DIR)/$(SERVICE_NAME).zip" ]; then \
		aws lambda update-function-code \
			--function-name $(SERVICE_NAME) \
			--zip-file fileb://$(PACKAGE_DIR)/$(SERVICE_NAME).zip \
			--region $(AWS_REGION); \
	else \
		echo "❌ Lambda package not found for deployment"; \
		exit 1; \
	fi
	@echo "✅ Lambda function $(SERVICE_NAME) deployed successfully"