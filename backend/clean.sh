#!/bin/bash
# Script to clean up temporary files and scripts used for aws-lc-sys workarounds
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Cleaning up temporary files and scripts..."

# Remove temporary build scripts
FILES_TO_REMOVE=(
  "scripts/build-authorizer.sh"
  "scripts/build-common.sh"
  "scripts/cross-build.sh"
  "scripts/setup-rust-flags.sh"
  "scripts/build-docker.sh"
  "docker-build.sh"
)

for file in "${FILES_TO_REMOVE[@]}"; do
  if [ -f "$SCRIPT_DIR/$file" ]; then
    echo "Removing $file..."
    rm "$SCRIPT_DIR/$file"
  fi
done

# Remove any temporary .cargo directories in services
for service_dir in "$SCRIPT_DIR"/*; do
  if [ -d "$service_dir" ] && [ -d "$service_dir/.cargo" ] && [ "$(basename "$service_dir")" != ".cargo" ]; then
    echo "Removing .cargo directory from $(basename "$service_dir")..."
    rm -rf "$service_dir/.cargo"
  fi
done

echo "✅ Cleanup completed successfully!"
echo "Use the new simplified ./build.sh script for building services." 