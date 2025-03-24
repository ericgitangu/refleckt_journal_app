# Root Makefile for the Reflekt Journal backend
.PHONY: all build test clean release verify package deploy

# List all services
SERVICES := common ai-service analytics-service authorizer db-init entry-service prompts-service settings-service

# Default target architecture for AWS Lambda
ARCH ?= x86_64-unknown-linux-musl

# Default build profile
PROFILE ?= release

# Target to build everything
all:
	@echo "Building all services..."
	@for service in $(SERVICES); do \
		echo "Building $$service..."; \
		$(MAKE) -C $$service all || exit 1; \
	done
	@echo "All services built successfully!"

# Target to build all services
build:
	@echo "Building all services..."
	@for service in $(SERVICES); do \
		echo "Building $$service..."; \
		$(MAKE) -C $$service build || exit 1; \
	done
	@echo "All services built successfully!"

# Target to run tests for all services
test:
	@echo "Running tests for all services..."
	@for service in $(SERVICES); do \
		echo "Testing $$service..."; \
		$(MAKE) -C $$service test || exit 1; \
	done
	@echo "All tests passed!"

# Target to clean all build artifacts
clean:
	@echo "Cleaning all services..."
	@for service in $(SERVICES); do \
		echo "Cleaning $$service..."; \
		$(MAKE) -C $$service clean || exit 1; \
	done
	@echo "All services cleaned!"

# Target to package all Lambda functions
package:
	@echo "Packaging all services for Lambda deployment..."
	@for service in $(SERVICES); do \
		if [ "$$service" != "common" ]; then \
			echo "Packaging $$service..."; \
			$(MAKE) -C $$service package || exit 1; \
		fi \
	done
	@echo "All services packaged successfully!"

# Target to verify all Lambda packages
verify:
	@echo "Verifying all Lambda packages..."
	@for service in $(SERVICES); do \
		if [ "$$service" != "common" ]; then \
			echo "Verifying $$service..."; \
			$(MAKE) -C $$service verify-lambda || exit 1; \
		fi \
	done
	@echo "All Lambda packages verified successfully!"

# Target to deploy all services
deploy:
	@echo "Deploying all services..."
	@for service in $(SERVICES); do \
		if [ "$$service" != "common" ]; then \
			echo "Deploying $$service..."; \
			$(MAKE) -C $$service deploy || exit 1; \
		fi \
	done
	@echo "All services deployed successfully!"

# Help documentation
help:
	@echo "Reflekt Journal Backend Build System"
	@echo "==================================="
	@echo "Available targets:"
	@echo "  all       - Build, package, and verify all services"
	@echo "  build     - Build all services"
	@echo "  test      - Run tests for all services"
	@echo "  clean     - Clean all build artifacts"
	@echo "  package   - Package all Lambda functions"
	@echo "  verify    - Verify all Lambda packages"
	@echo "  deploy    - Deploy all services to AWS Lambda"
	@echo ""
	@echo "Configuration options:"
	@echo "  ARCH      - Target architecture (default: $(ARCH))"
	@echo "  PROFILE   - Build profile (default: $(PROFILE))"
	@echo ""
	@echo "Example usage:"
	@echo "  make all ARCH=aarch64-unknown-linux-gnu PROFILE=release" 