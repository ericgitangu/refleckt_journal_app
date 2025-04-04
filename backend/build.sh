#!/bin/bash
# Simple, clean build script for cross-compiling all services
set -e

# Detect script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET=${TARGET:-"aarch64-unknown-linux-musl"}
RUST_VERSION=${RUST_VERSION:-"1.85.0"}

echo "=== Building Reflekt Journal backend services for $TARGET ==="

# Setup environment for cross-compilation
setup_environment() {
  # Add musl-cross to PATH if needed
  if ! command -v aarch64-linux-musl-gcc &>/dev/null; then
    if [ -d "/usr/local/opt/musl-cross/bin" ]; then
      export PATH="/usr/local/opt/musl-cross/bin:$PATH"
      echo "Added musl-cross to PATH"
    else
      echo "Error: musl-cross compiler not found"
      echo "Please install it with: brew install musl-cross"
      exit 1
    fi
  fi
  
  # Create a global .cargo/config.toml for cross-compilation
  mkdir -p "$SCRIPT_DIR/.cargo"
  cat > "$SCRIPT_DIR/.cargo/config.toml" << EOF
[build]
rustflags = ["-C", "link-arg=-s"]

[target.aarch64-unknown-linux-musl]
linker = "aarch64-linux-musl-gcc"
rustflags = [
  "-C", "link-self-contained=yes"
]

[env]
OPENSSL_STATIC = "1"
OPENSSL_DIR = "/usr/local/opt/openssl@1.1"
EOF

  # Ensure the target is installed
  rustup target add --toolchain "$RUST_VERSION" "$TARGET"
}

# Build common library
build_common() {
  echo "Building common library..."
  cd "$SCRIPT_DIR/common"
  rustup run "$RUST_VERSION" cargo build --release --target "$TARGET" --features="openssl,jwt-auth"
  echo "✅ Common library built successfully"
}

# Build a service
build_service() {
  local service=$1
  echo "Building $service service..."
  cd "$SCRIPT_DIR/$service"
  
  # Build the service with cargo
  rustup run "$RUST_VERSION" cargo build --release --target "$TARGET"
  
  # Create bootstrap file for Lambda
  mkdir -p "target/lambda"
  cp "target/${TARGET}/release/journal-${service}" "target/lambda/bootstrap" 2>/dev/null || \
  cp "target/${TARGET}/release/${service}" "target/lambda/bootstrap"
  chmod +x "target/lambda/bootstrap"
  
  echo "✅ $service service built successfully"
}

# Run the build process
setup_environment
build_common

# Build all services
for service_dir in "$SCRIPT_DIR"/*; do
  if [ -d "$service_dir" ] && [ -f "$service_dir/Cargo.toml" ] && [ "$(basename "$service_dir")" != "common" ]; then
    build_service "$(basename "$service_dir")"
  fi
done

echo "✅ All services built successfully!" 