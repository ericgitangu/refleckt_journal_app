#!/bin/bash
# Script to verify that a Lambda package is properly formatted for AWS deployment

set -e

# Check if a file path was provided
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <lambda-zip-file>"
    exit 1
fi

LAMBDA_ZIP=$1
TEMP_DIR=$(mktemp -d)
BOOTSTRAP_FILE="bootstrap"

echo "🔍 Verifying Lambda package: $LAMBDA_ZIP"

# Check if file exists
if [ ! -f "$LAMBDA_ZIP" ]; then
    echo "❌ Error: File not found: $LAMBDA_ZIP"
    exit 1
fi

# Check file extension
if [[ "$LAMBDA_ZIP" != *.zip ]]; then
    echo "❌ Error: File must be a ZIP archive: $LAMBDA_ZIP"
    exit 1
fi

# Check file size (AWS Lambda has a 50MB deployment package limit for direct uploads)
FILE_SIZE=$(du -m "$LAMBDA_ZIP" | cut -f1)
if [ "$FILE_SIZE" -gt 50 ]; then
    echo "⚠️ Warning: File size exceeds 50MB ($FILE_SIZE MB). This may require S3 deployment."
fi

# Extract the ZIP file to temp directory
echo "📦 Extracting package..."
unzip -q "$LAMBDA_ZIP" -d "$TEMP_DIR"

# Check for bootstrap file
if [ ! -f "$TEMP_DIR/$BOOTSTRAP_FILE" ]; then
    echo "❌ Error: Missing required bootstrap file"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Check if bootstrap is executable
if [ ! -x "$TEMP_DIR/$BOOTSTRAP_FILE" ]; then
    echo "❌ Error: bootstrap file is not executable"
    chmod +x "$TEMP_DIR/$BOOTSTRAP_FILE"
    echo "✅ Fixed: Made bootstrap executable"
    
    # Repackage the zip with executable bootstrap
    cd "$TEMP_DIR"
    zip -r "../fixed_$(basename $LAMBDA_ZIP)" *
    echo "✅ Created fixed package: fixed_$(basename $LAMBDA_ZIP)"
    cd - > /dev/null
else
    echo "✅ bootstrap file is executable"
fi

# Check architecture (optional, if we have the file command)
if command -v file &> /dev/null; then
    ARCH=$(file "$TEMP_DIR/$BOOTSTRAP_FILE" | grep -o "x86-64\|aarch64")
    if [ -n "$ARCH" ]; then
        if [ "$ARCH" == "x86-64" ]; then
            echo "✅ Architecture: x86-64 (Lambda compatible)"
        elif [ "$ARCH" == "aarch64" ]; then
            echo "✅ Architecture: ARM64 (Lambda compatible)"
        fi
    else
        echo "⚠️ Warning: Could not determine architecture"
    fi
fi

# Clean up
rm -rf "$TEMP_DIR"

echo "✅ Lambda package verification complete. Package appears to be valid."
exit 0 