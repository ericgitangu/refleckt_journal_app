# Root Makefile for Refleckt Journal App Backend
.PHONY: all build test clean deploy install-deps help setup-lambda build-all verify-all package-all

# Services to build (in dependency order)
SERVICES := common authorizer analytics-service ai-service entry-service prompts-service settings-service

# Default AWS region
AWS_REGION ?= us-east-1

# Lambda compilation settings
TARGET ?= aarch64-unknown-linux-musl
LAMBDA_RUNTIME ?= provided.al2023

# Default help target
help:
	@echo "Refleckt Journal App Backend Build System"
	@echo "========================================"
	@echo ""
	@echo "Available targets:"
	@echo "  all             - Build, package and verify all services"
	@echo "  build           - Build all services with standard build"
	@echo "  build-all       - Build all services with cargo-lambda for Lambda compatibility"
	@echo "  test            - Run tests for all services"
	@echo "  clean           - Clean all services"
	@echo "  deploy          - Deploy all services to AWS"
	@echo "  package-all     - Package all services for Lambda deployment"
	@echo "  setup-lambda    - Set up Lambda build environment"
	@echo "  install-deps    - Install build dependencies"
	@echo "  verify-all      - Verify all Lambda packages"
	@echo "  help            - Show this help message"
	@echo ""
	@echo "Individual service targets:"
	@echo "  build-SERVICE      - Build a specific service"
	@echo "  build-lambda-SERVICE - Build a specific service with cargo-lambda"
	@echo "  test-SERVICE       - Test a specific service"
	@echo "  clean-SERVICE      - Clean a specific service"
	@echo "  deploy-SERVICE     - Deploy a specific service"
	@echo ""
	@echo "Environment variables:"
	@echo "  TARGET           - Target architecture (default: $(TARGET))"
	@echo "  AWS_REGION       - AWS region (default: $(AWS_REGION))"
	@echo "  LAMBDA_RUNTIME   - Lambda runtime (default: $(LAMBDA_RUNTIME))"

# Set up Lambda build environment
setup-lambda:
	@echo "Setting up Lambda build environment..."
	@if ! command -v cargo-lambda &> /dev/null; then \
		echo "Installing cargo-lambda..."; \
		cargo install cargo-lambda; \
	fi
	@rustup target add $(TARGET)
	@echo "Creating or updating root-level Rust toolchain file for Lambda compatibility..."
	@if [ ! -f rust-toolchain.toml ]; then \
		echo '[toolchain]' > rust-toolchain.toml; \
		echo 'channel = "1.85.0"' >> rust-toolchain.toml; \
		echo 'components = ["rustfmt", "clippy"]' >> rust-toolchain.toml; \
		echo 'targets = ["aarch64-unknown-linux-musl"]' >> rust-toolchain.toml; \
		echo 'profile = "minimal"' >> rust-toolchain.toml; \
	fi
	@echo "Ensuring no duplicate toolchain files exist in service directories..."
	@for service in $(SERVICES); do \
		if [ -f "$$service/rust-toolchain.toml" ]; then \
			echo "Removing duplicate toolchain file from $$service..."; \
			rm "$$service/rust-toolchain.toml"; \
		fi; \
	done
	@echo "✅ Lambda build environment set up successfully with consolidated toolchain configuration"

# Install dependencies
install-deps: setup-lambda
	@echo "Installing build dependencies..."
	@if ! command -v cargo-lambda &> /dev/null; then \
		echo "Installing cargo-lambda..."; \
		cargo install cargo-lambda; \
	fi
	@echo "✅ Dependencies installed"

# Default target
all: build-all package-all verify-all

# Build all services
build:
	@echo "Building all services..."
	@./scripts/build-all.sh
	@echo "✅ All services built successfully"

# Build all services with cargo-lambda for Lambda
build-all: setup-lambda
	@echo "Building all services with cargo-lambda for Lambda compatibility..."
	@TARGET=$(TARGET) LAMBDA_RUNTIME=$(LAMBDA_RUNTIME) ./scripts/build-all.sh
	@echo "✅ All services built successfully with cargo-lambda"

# Package all services
package-all:
	@echo "Packaging all services for Lambda deployment..."
	@for service in $(filter-out common,$(SERVICES)); do \
		if [ -f "$$service/Makefile" ]; then \
			echo "Packaging $$service..."; \
			$(MAKE) -C $$service package TARGET=$(TARGET) || exit 1; \
		else \
			echo "No Makefile for $$service, using default packaging..."; \
			if [ -d "$$service/target/lambda/$$service" ]; then \
				echo "Lambda artifact already exists for $$service"; \
			else \
				echo "Creating Lambda deployment package for $$service..."; \
				mkdir -p $$service/target/lambda; \
				cp $$service/target/$(TARGET)/release/$$service $$service/target/lambda/bootstrap; \
				chmod +x $$service/target/lambda/bootstrap; \
				cd $$service/target/lambda && zip -j ../$$service.zip bootstrap && cd ../../../; \
			fi; \
		fi; \
	done
	@echo "✅ All services packaged successfully"

# Verify all Lambda packages
verify-all:
	@echo "Verifying all Lambda packages..."
	@for service in $(filter-out common,$(SERVICES)); do \
		if [ -f "$$service/target/$$service.zip" ]; then \
			echo "Verifying $$service..."; \
			./scripts/verify-lambda.sh "$$service/target/$$service.zip" || exit 1; \
		elif [ -f "$$service/target/lambda/$$service.zip" ]; then \
			echo "Verifying $$service..."; \
			./scripts/verify-lambda.sh "$$service/target/lambda/$$service.zip" || exit 1; \
		elif [ -d "$$service/target/lambda/$$service" ]; then \
			echo "Verifying cargo-lambda build for $$service..."; \
			./scripts/verify-lambda.sh "$$service/target/lambda/$$service" || exit 1; \
		else \
			echo "No Lambda package found for $$service, skipping verification"; \
		fi; \
	done
	@echo "✅ All Lambda packages verified successfully"

# Test all services
test:
	@echo "Testing all services..."
	@for service in $(SERVICES); do \
		echo "Testing $$service..."; \
		if [ -f "$$service/Makefile" ]; then \
			$(MAKE) -C $$service test || exit 1; \
		else \
			cd $$service && cargo test && cd ..; \
		fi; \
	done
	@echo "✅ All tests passed"

# Clean all services
clean:
	@echo "Cleaning all services..."
	@for service in $(SERVICES); do \
		if [ -f "$$service/Makefile" ]; then \
			$(MAKE) -C $$service clean; \
		else \
			cd $$service && cargo clean && cd ..; \
		fi; \
	done
	@echo "✅ All services cleaned"

# Deploy all services
deploy:
	@echo "Deploying all services to AWS..."
	@for service in $(filter-out common,$(SERVICES)); do \
		if [ -f "$$service/Makefile" ]; then \
			echo "Deploying $$service..."; \
			$(MAKE) -C $$service deploy AWS_REGION=$(AWS_REGION) || exit 1; \
		else \
			echo "No Makefile for $$service, skipping deployment"; \
		fi; \
	done
	@echo "✅ All services deployed successfully"

# Initialize the project
init: all
	@echo "Initializing the project..."
	@./scripts/init.sh
	@echo "✅ Project initialized successfully"

# Dynamic targets for individual services
build-%:
	@echo "Building $*..."
	@if [ -d "$*" ]; then \
		if [ -f "$*/Makefile" ]; then \
			$(MAKE) -C $* build; \
		else \
			cd $* && cargo build --release && cd ..; \
		fi; \
	else \
		echo "❌ Service $* not found"; \
		exit 1; \
	fi

build-lambda-%: setup-lambda
	@echo "Building $* with cargo-lambda..."
	@if [ -d "$*" ]; then \
		if [ -f "$*/Makefile" ]; then \
			$(MAKE) -C $* build-lambda TARGET=$(TARGET) LAMBDA_RUNTIME=$(LAMBDA_RUNTIME); \
		else \
			cd $* && cargo lambda build --release --target $(TARGET) --lambda-runtime $(LAMBDA_RUNTIME) && cd ..; \
		fi; \
	else \
		echo "❌ Service $* not found"; \
		exit 1; \
	fi

test-%:
	@echo "Testing $*..."
	@if [ -d "$*" ]; then \
		if [ -f "$*/Makefile" ]; then \
			$(MAKE) -C $* test; \
		else \
			cd $* && cargo test && cd ..; \
		fi; \
	else \
		echo "❌ Service $* not found"; \
		exit 1; \
	fi

clean-%:
	@echo "Cleaning $*..."
	@if [ -d "$*" ]; then \
		if [ -f "$*/Makefile" ]; then \
			$(MAKE) -C $* clean; \
		else \
			cd $* && cargo clean && cd ..; \
		fi; \
	else \
		echo "❌ Service $* not found"; \
		exit 1; \
	fi

deploy-%:
	@echo "Deploying $*..."
	@if [ -d "$*" ] && [ "$*" != "common" ]; then \
		if [ -f "$*/Makefile" ]; then \
			$(MAKE) -C $* deploy AWS_REGION=$(AWS_REGION); \
		else \
			echo "No Makefile for $*, skipping deployment"; \
		fi; \
	elif [ "$*" = "common" ]; then \
		echo "⚠️ Common library is not deployable"; \
	else \
		echo "❌ Service $* not found"; \
		exit 1; \
	fi

package-%:
	@echo "Packaging $*..."
	@if [ -d "$*" ] && [ "$*" != "common" ]; then \
		if [ -f "$*/Makefile" ]; then \
			$(MAKE) -C $* package TARGET=$(TARGET); \
		else \
			if [ -d "$*/target/lambda/$*" ]; then \
				echo "cargo-lambda artifact already exists for $*"; \
			else \
				echo "Creating Lambda deployment package for $*..."; \
				mkdir -p $*/target/lambda; \
				cp $*/target/$(TARGET)/release/$* $*/target/lambda/bootstrap; \
				chmod +x $*/target/lambda/bootstrap; \
				cd $*/target/lambda && zip -j ../$*.zip bootstrap && cd ../../../; \
			fi; \
		fi; \
	elif [ "$*" = "common" ]; then \
		echo "⚠️ Common library does not need packaging"; \
	else \
		echo "❌ Service $* not found"; \
		exit 1; \
	fi

verify-%:
	@echo "Verifying $*..."
	@if [ -d "$*" ] && [ "$*" != "common" ]; then \
		if [ -f "$*/target/$*.zip" ]; then \
			./scripts/verify-lambda.sh "$*/target/$*.zip"; \
		elif [ -f "$*/target/lambda/$*.zip" ]; then \
			./scripts/verify-lambda.sh "$*/target/lambda/$*.zip"; \
		elif [ -d "$*/target/lambda/$*" ]; then \
			./scripts/verify-lambda.sh "$*/target/lambda/$*"; \
		else \
			echo "No Lambda package found for $*"; \
			exit 1; \
		fi; \
	elif [ "$*" = "common" ]; then \
		echo "⚠️ Common library does not need verification"; \
	else \
		echo "❌ Service $* not found"; \
		exit 1; \
	fi