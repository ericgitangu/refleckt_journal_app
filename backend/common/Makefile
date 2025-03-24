# Makefile for journal-common library
.PHONY: build test clean release

# Default target architecture for AWS Lambda
ARCH ?= x86_64-unknown-linux-musl

# Default build profile
PROFILE ?= release

# Build the common library
build:
	cargo build --$(PROFILE)

# Build with musl target for Lambda compatibility
build-musl:
	cargo build --target $(ARCH) --$(PROFILE)

# Run tests
test:
	cargo test

# Clean build artifacts
clean:
	cargo clean

# Generate documentation
docs:
	cargo doc --no-deps

# Build for release
release: build-musl
	@echo "Common library built successfully for $(ARCH)" 