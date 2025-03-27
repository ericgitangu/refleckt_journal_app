.PHONY: all build test clean deploy install-deps help setup-cross

# Services to build (in dependency order)
SERVICES := common authorizer analytics-service ai-service entry-service prompts-service settings-service

# Default AWS region
AWS_REGION ?= us-east-1

# Default target architecture
TARGET := aarch64-unknown-linux-musl
CROSS_TOOLCHAIN := /usr/local/opt/$(TARGET)

# Default help target
help:
	@echo "Refleckt Journal App Backend Build System"
	@echo "========================================"
	@echo ""
	@echo "Available targets:"
	@echo "  all             - Build and package all services"
	@echo "  build           - Build all services"
	@echo "  test            - Run tests for all services"
	@echo "  clean           - Clean all services"
	@echo "  deploy          - Deploy all services to AWS"
	@echo "  setup-cross     - Set up cross-compilation environment"
	@echo "  install-deps    - Install build dependencies"
	@echo "  help            - Show this help message"
	@echo ""
	@echo "Individual service targets:"
	@echo "  build-SERVICE      - Build a specific service"
	@echo "  test-SERVICE       - Test a specific service"
	@echo "  clean-SERVICE      - Clean a specific service"
	@echo "  deploy-SERVICE     - Deploy a specific service"

# Set up cross-compilation environment
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

# Install dependencies
install-deps: setup-cross
	@echo "Installing build dependencies..."
	cargo install cargo-lambda --force
	@echo "✅ Dependencies installed"

# Default target
all: build

# Build all services
build: setup-cross
	@echo "Building all services..."
	@for service in $(SERVICES); do \
		echo "Building $$service..."; \
		$(MAKE) -C $$service build || exit 1; \
	done
	@echo "✅ All services built successfully"

# Test all services
test:
	@echo "Testing all services..."
	@for service in $(SERVICES); do \
		echo "Testing $$service..."; \
		$(MAKE) -C $$service test || exit 1; \
	done
	@echo "✅ All tests passed"

# Clean all services
clean:
	@echo "Cleaning all services..."
	@for service in $(SERVICES); do \
		$(MAKE) -C $$service clean; \
	done
	@echo "✅ All services cleaned"

# Deploy all services
deploy:
	@echo "Deploying all services to AWS..."
	@for service in $(SERVICES); do \
		if [ "$$service" != "common" ]; then \
			echo "Deploying $$service..."; \
			$(MAKE) -C $$service deploy || exit 1; \
		fi \
	done
	@echo "✅ All services deployed successfully"

# Dynamic targets for individual services
build-%:
	@echo "Building $*..."
	@if [ -d "$*" ]; then \
		$(MAKE) -C $* build; \
	else \
		echo "❌ Service $* not found"; \
		exit 1; \
	fi

test-%:
	@echo "Testing $*..."
	@if [ -d "$*" ]; then \
		$(MAKE) -C $* test; \
	else \
		echo "❌ Service $* not found"; \
		exit 1; \
	fi

clean-%:
	@echo "Cleaning $*..."
	@if [ -d "$*" ]; then \
		$(MAKE) -C $* clean; \
	else \
		echo "❌ Service $* not found"; \
		exit 1; \
	fi

deploy-%:
	@echo "Deploying $*..."
	@if [ -d "$*" ] && [ "$*" != "common" ]; then \
		$(MAKE) -C $* deploy; \
	elif [ "$*" = "common" ]; then \
		echo "⚠️ Common library is not deployable"; \
	else \
		echo "❌ Service $* not found"; \
		exit 1; \
	fi