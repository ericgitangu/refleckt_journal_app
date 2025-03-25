#!/bin/bash
# Script to build all Lambda services in the backend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directory containing this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

# Target architecture
ARCH=${ARCH:-"x86_64-unknown-linux-musl"}

# List of all services (directories with Cargo.toml)
SERVICES=(
    "common"
    "entry-service"
    "settings-service"
    "ai-service"
    "analytics-service"
    "authorizer"
    "prompts-service"
    "db-init"
)

# Make sure the verify script is executable
chmod +x "$SCRIPT_DIR/verify-lambda.sh"

# Build the common library first
echo -e "${YELLOW}Building common library...${NC}"
cd "$BACKEND_DIR/common"
make build-musl
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to build common library${NC}"
    exit 1
fi
echo -e "${GREEN}Common library built successfully${NC}"

# Build each service
for service in "${SERVICES[@]}"; do
    # Skip common as we've already built it
    if [ "$service" == "common" ]; then
        continue
    fi
    
    # Check if service directory exists and has a Makefile
    if [ -d "$BACKEND_DIR/$service" ] && [ -f "$BACKEND_DIR/$service/Makefile" ]; then
        echo -e "${YELLOW}Building $service...${NC}"
        cd "$BACKEND_DIR/$service"
        
        # Run make all which builds, packages, and verifies
        make all
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}Failed to build $service${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}$service built successfully${NC}"
        
        # Verify the Lambda package
        if [ -f "./target/$service.zip" ]; then
            "$SCRIPT_DIR/verify-lambda.sh" "./target/$service.zip"
        else
            echo -e "${YELLOW}Warning: Lambda package not found for $service${NC}"
        fi
    else
        echo -e "${YELLOW}Skipping $service (no Makefile found)${NC}"
    fi
done

echo -e "${GREEN}All services built successfully${NC}"
exit 0 