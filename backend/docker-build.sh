#!/bin/bash
set -e

# Build the Docker image for building
docker build -t rust-builder -f Dockerfile.build .

# Run the builder
SERVICE=$1
if [ -z "$SERVICE" ]; then
  echo "Usage: ./docker-build.sh <service-directory>"
  echo "Example: ./docker-build.sh entry-service"
  exit 1
fi

if [ ! -d "$SERVICE" ]; then
  echo "Error: Directory $SERVICE does not exist"
  exit 1
fi

# Run the build in Docker
docker run --rm -v $(pwd)/$SERVICE:/app rust-builder "cargo build --target aarch64-unknown-linux-musl"

echo "Build completed successfully!" 