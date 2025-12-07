# 🚀 Reflekt Journal App Backend

A serverless microservices-based backend architecture powering the Reflekt Journal application, deployed on AWS.

## 📚 Table of Contents

- [📋 Overview](#-overview)
- [🏗️ Architecture](#️-architecture)
- [🧩 Services](#-services)
- [🤖 AI Capabilities](#-ai-capabilities)
- [🛠️ Getting Started](#️-getting-started)
- [📜 Scripts](#-scripts)
- [⚙️ Lambda Build System](#️-lambda-build-system)
- [🔧 Scripts and Build System](#-scripts-and-build-system)
- [☁️ AWS Deployment](#️-aws-deployment)
- [🧪 Testing](#-testing)
- [🔧 Configuration](#-configuration)
- [📝 API Documentation](#-api-documentation)
- [👨‍💻 Author](#-author)

## 📋 Overview

The Reflekt Journal App backend is built on a serverless microservices architecture using AWS Lambda, API Gateway, DynamoDB, and EventBridge. This architecture allows for scalable, maintainable, and independently deployable services with minimal operational overhead. Each service is responsible for a specific domain of the application and communicates through well-defined APIs and event-driven patterns.

## 🏗️ Architecture

The backend follows a serverless, domain-driven microservices architecture with the following principles:

- **Serverless First**: Leveraging AWS Lambda for compute, eliminating server management
- **Service Independence**: Each service can be developed, deployed, and scaled independently
- **Domain Separation**: Services are organized around business capabilities
- **API Gateway**: Single entry point for client requests, with JWT authentication
- **Event-Driven Communication**: Using EventBridge for asynchronous communication
- **Shared Components**: Common code abstracted into a shared library

For a visual representation of our architecture, see the [Architecture Diagram](./infrastructure/docs/architecture.md).

## 🧩 Services

### 📔 Entry Service (`entry-service/`)

Core Lambda service managing journal entries - creation, retrieval, updating, and deletion of journal content.

- Handles CRUD operations for journal entries
- Manages entry categorization and tagging
- Provides search functionality
- Stores data in DynamoDB

### 📊 Analytics Service (`analytics-service/`)

Lambda service that processes and analyzes journal data to provide insights.

- Sentiment analysis
- Entry frequency statistics
- Topic identification and trends
- Mood tracking over time

### 🧠 AI Service (`ai-service/`)

Lambda service that integrates AI capabilities to enhance the journaling experience.

- Content suggestions
- Sentiment analysis
- Reflective questions generation
- Summary generation
- Triggered by EventBridge events

### ⚙️ Settings Service (`settings-service/`)

Lambda service that manages user preferences and application settings.

- User profile management
- Application preferences
- Notification settings
- Theme and display options

### 🔐 Authorizer (`authorizer/`)

Custom Lambda authorizer for API Gateway.

- JWT token validation
- Permission management
- Role-based access control

### 🗄️ Common (`common/`)

Shared utilities and code used across multiple Lambda functions.

- Data models
- Helper functions
- Middleware
- Error handling

## 🤖 AI Capabilities

Reflekt leverages advanced AI models to enhance the journaling experience with insightful analysis and personalized content.

### Supported AI Providers

- **OpenAI GPT**: Using GPT-4 or GPT-3.5 for advanced language understanding
- **Anthropic Claude**: Utilizing Claude models for thoughtful analysis
- **RustBert**: Local fallback option for testing without API costs

### Key AI Features

#### Journal Entry Analysis
- **Sentiment Analysis**: Automatically detect the emotional tone of entries
- **Topic Extraction**: Identify key themes and topics from journal content
- **Reflective Questions**: Generate thoughtful questions based on entry content
- **Personal Insights**: Provide observations about writing patterns and emotional trends

#### AI-Generated Prompts
- **Custom Prompts**: Generate tailored writing prompts based on user preferences
- **Theme-Based Suggestions**: Create prompts related to specific themes (relationships, gratitude, etc.)
- **Mood-Specific Content**: Adapt prompt tone based on desired emotional state
- **Daily Inspiration**: Provide fresh journaling ideas to combat writer's block

### Configuration

To use the AI features, configure the following environment variables:

```bash
# Select AI provider: openai, anthropic, or rustbert (for local testing)
AI_PROVIDER=openai

# OpenAI Configuration
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-4o

# Anthropic Configuration
ANTHROPIC_API_KEY=your-api-key
ANTHROPIC_MODEL=claude-3-haiku-20240307
```

### API Endpoints for AI Features

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/entries/{id}/insights` | GET | Retrieve AI analysis for a specific journal entry |
| `/prompts/generate` | POST | Generate custom prompts based on category, themes, and mood |
| `/analytics/trends` | GET | Get AI-powered insights about journaling patterns |

### Local Development

For local testing without API costs, use the RustBert option:

```bash
AI_PROVIDER=rustbert
```

This provides basic AI functionality without external API calls, suitable for development and testing.

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18+)
- Yarn package manager
- AWS CLI configured with appropriate credentials
- AWS SAM CLI
- Rust and Cargo (latest stable)
- cargo-lambda (`cargo install cargo-lambda`)
- jq for JSON processing
- curl for HTTP requests
- Docker (for local DynamoDB development)

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/reflekt-journal-app.git
   cd reflekt-journal-app/backend
   ```

2. Install dependencies for all services:
   ```bash
   # For each service directory
   cd <service-name>
   yarn install
   cd ..
   
   # Or install all dependencies at once
   for dir in */; do
     (cd "$dir" && yarn install)
   done
   ```

3. Build all services:
   ```bash
   ./scripts/build-all.sh
   ```

4. Start services locally using SAM CLI:
   ```bash
   sam local start-api
   ```

5. For local development with DynamoDB:
   ```bash
   docker run -p 8000:8000 amazon/dynamodb-local
   ```

## 🔧 Scripts and Build System

### Directory Structure

The project uses a consistent directory structure for scripts and logging:

```
backend/
├── scripts/           # Build and deployment scripts
│   ├── build-all.sh   # Builds all services
│   ├── common.sh      # Common utility functions
│   ├── init.sh        # Initializes the entire backend
│   └── deploy-stack.sh # Deploys to AWS
├── logs/              # All logging is consolidated here
│   ├── build/         # Build logs
│   ├── init/          # Initialization logs
│   └── services/      # Runtime service logs
├── common/            # Shared code library
└── [services]/        # Individual service directories
```

### Common Utilities (`common.sh`)

Shared utility functions used across all scripts:

```bash
# Source the utilities
source ./scripts/common.sh

# Available functions:
log_info "Message"      # Info level logging
log_success "Message"   # Success level logging
log_warning "Message"   # Warning level logging
log_error "Message"     # Error level logging
log_debug "Message"     # Debug level logging (requires LOG_LEVEL=0)

# AWS utilities
aws_check_credentials   # Verify AWS credentials
aws_get_stack_outputs   # Get CloudFormation stack outputs
aws_verify_template     # Validate CloudFormation template

# Helper functions
generate_random_string  # Generate random string for secrets
wait_for_url            # Wait for endpoint to become available
```

### Build System

We've implemented an optimized build system using `cargo-lambda` for AWS Lambda function compilation and packaging.

#### Key Build System Features

1. **Specialized for Lambda**: Using `cargo-lambda` which is purpose-built for AWS Lambda development
2. **ARM64 Standardization**: Exclusively targeting ARM64 architecture for better performance and lower cost
3. **Simplified Workflow**: Handles both compilation and packaging in a single step
4. **No Root Required**: Tools are installed locally within the project directory

### Cross-Compilation Setup

The most common issue with building Lambda functions on macOS is the cross-compilation from macOS to Linux. We use musl-cross to handle this:

```bash
# Install musl-cross with aarch64 target
brew install FiloSottile/musl-cross/musl-cross --with-aarch64
```

If you already have musl-cross installed but are missing the aarch64 target, you can reinstall:

```bash
brew reinstall FiloSottile/musl-cross/musl-cross --with-aarch64
```

#### Verifying musl-cross Installation

After installation, verify that the aarch64 compiler is available:

```bash
# Check if the compiler exists
ls -la "$(brew --prefix musl-cross)/bin/aarch64-linux-musl-gcc"

# Verify it can be executed
"$(brew --prefix musl-cross)/bin/aarch64-linux-musl-gcc" --version
```

If the compiler is not found, it might be because:
1. You installed musl-cross without the `--with-aarch64` flag
2. The compiler is installed but not in your PATH
3. Homebrew didn't link the binaries properly

#### Lightweight llvm-ar Setup

Our build system uses a lightweight llvm-ar replacement to avoid requiring the full LLVM toolchain:

```bash
# Set up the lightweight llvm-ar
./scripts/install-llvm-ar.sh
```

This script:
- Creates a symlink from system `/usr/bin/ar` to `llvm-ar` in the local bin directory
- Sets up appropriate environment variables to avoid needing the actual llvm-ar
- Includes verification to confirm it's working correctly

### OpenSSL-Based Cryptography

This project uses OpenSSL for all cryptographic operations, including JWT validation. We've chosen OpenSSL for its:

1. Better cross-platform compatibility, especially on ARM64
2. Comprehensive cryptographic functionality
3. Well-maintained and widely used implementation

By using OpenSSL with its vendored feature, we avoid platform-specific cryptographic dependencies and ensure consistent behavior across all deployment environments.

### ARM64-Only Approach

We've standardized on ARM64 (aarch64) as our exclusive target architecture for several reasons:

1. **Cost Efficiency**: ARM64 Lambda functions are ~20% cheaper than x86_64
2. **Better Performance**: Often provides better performance per dollar
3. **Native Mac Support**: Works better with Apple Silicon (M1/M2/M3) Macs
4. **Fewer Compatibility Issues**: Architecture-specific cryptography issues are avoided by using OpenSSL
5. **Future-Proof**: AWS is heavily investing in ARM-based solutions
6. **Simplified Setup**: By standardizing on one architecture, we avoid complexity and potential issues

### Rust Toolchain Configuration

All services use a consistent `rust-toolchain.toml` file:

```toml
[toolchain]
channel = "1.85.0"
components = ["rustfmt", "clippy"]
targets = ["aarch64-unknown-linux-musl"]
profile = "minimal"
```

This configuration:
- Pins the Rust version to 1.85.0
- Includes necessary components (rustfmt, clippy)
- Specifies only the ARM64 target
- Uses the minimal profile for faster installation

### Centralized Environment Configuration

We use a centralized `set_env.sh` script that sets all environment variables in one place. Source it with:

```bash
# Source environment variables
source ./scripts/set_env.sh
```

This sets up:
- `TARGET`: The compilation target (`aarch64-unknown-linux-musl`)
- `RUST_VERSION`: The Rust version to use
- `OPENSSL_DIR`: Path to OpenSSL installation
- `AWS_LC_SYS_STATIC`: Prevents aws-lc-sys from compiling C code
- `AR`: Path to the ar tool (uses system ar on macOS)
- `CC_aarch64_unknown_linux_musl`: Path to the aarch64 C compiler

### Root-Level Cargo Config

We use a single root-level `.cargo/config.toml` file for all services to ensure consistency and maintainability. This approach:
- Ensures all services use the same configuration
- Reduces duplication across services
- Simplifies updating configuration settings
- Reduces the risk of configuration drift between services

### Special Handling for Ring and aws-lc-sys

The authorizer service uses the Ring cryptography library with a special patch for cross-compilation. Our build system:
- Uses Anoma's fork of Ring that avoids assembly code
- Makes aws-lc-sys optional and uses a dummy implementation
- Builds the authorizer with `--no-default-features` to avoid Ring assembly code

### Build Script (`build-all.sh`)

Builds all Lambda functions and services:

```bash
# Build all services
./scripts/build-all.sh

# Build with options
./scripts/build-all.sh --clean
```

The build script:
- Sets up the necessary Rust cross-compilation environment
- Builds the common library first
- Builds each service using Makefiles or cargo-lambda
- Logs all build output to logs/build/ for debugging
- Verifies Lambda packages

### Initialization Script (`init.sh`)

Sets up and deploys the entire backend stack:

```bash
# Initialize the backend
./scripts/init.sh

# Initialize with specific options
./scripts/init.sh -s staging -r us-west-2
```

The init script:
1. Checks prerequisites and AWS credentials
2. Sets up the Lambda build environment
3. Builds all services with cargo-lambda
4. Deploys the CloudFormation stack
5. Updates environment files for development
6. Creates test users and credentials
7. Tests endpoints to verify deployment
8. Configures the frontend to use the new backend

### Deployment Script (`deploy-stack.sh`)

Deploys the backend stack to AWS:

```bash
# Deploy to dev environment
./scripts/deploy-stack.sh -s dev

# Deploy with options
./scripts/deploy-stack.sh -s dev -r us-east-1 -b my-deploy-bucket -j my-jwt-secret
```

Available options:
- `-n`: Stack name (default: reflekt-journal)
- `-s`: Stage (dev, staging, prod)
- `-r`: AWS Region
- `-b`: S3 bucket for deployment artifacts
- `-j`: JWT secret (generated randomly if not provided)

### Local Tools Installation

Tools are installed locally to avoid requiring root/sudo privileges:

```bash
cd backend
./scripts/setup-aarch64-tools.sh
source setup-env.sh  # If you open a new terminal
```

This script:
- Downloads and installs necessary tools to the local `.local/bin` directory
- Creates a `setup-env.sh` script with necessary environment variables
- Does NOT require root/sudo privileges
- Sets the PATH to include the local tools directory

### Test Endpoints Script (`test-endpoints.sh`)

Tests all API endpoints and logs requests/responses for debugging:

```bash
# Test all endpoints
./scripts/test-endpoints.sh

# Test specific endpoint
./scripts/test-endpoints.sh -e entries

# Test with options
./scripts/test-endpoints.sh -e entries -v
```

The test script:
- Tests all service endpoints (entries, settings, analytics, ai, prompts)
- Performs CRUD operations on resources
- Logs all requests and responses for debugging
- Saves detailed logs to the logs directory

### Logger Configuration

All scripts use a consistent logging system that writes to the `logs/` directory:

- `logs/build/`: Contains logs from the build process
- `logs/init/`: Contains logs from initialization and deployment
- `logs/services/`: Contains runtime logs from services

This consolidated logging structure makes it easier to find and diagnose issues.

## ☁️ AWS Deployment

The backend is deployed to AWS using AWS SAM (Serverless Application Model) with CloudFormation.

### Deployment Steps

1. Build the SAM application:
   ```bash
   sam build --template-file infrastructure/template.yaml
   ```

2. Deploy using the provided script:
   ```bash
   ./scripts/deploy-stack.sh -s dev -r us-east-1
   ```

   Available options:
   - `-n`: Stack name (default: reflekt-journal)
   - `-s`: Stage (dev, staging, prod)
   - `-r`: AWS Region
   - `-b`: S3 bucket for deployment artifacts
   - `-j`: JWT secret (generated randomly if not provided)

### AWS Resources

The deployment creates the following AWS resources:

- **API Gateway**: RESTful API with JWT authentication
- **Lambda Functions**: For each microservice
- **DynamoDB Tables**: For storing entries, settings, categories, and analytics
- **EventBridge**: For service-to-service communication
- **CloudWatch**: For logs and monitoring
- **IAM Roles**: With least-privilege permissions
- **S3 Buckets**: For deployment artifacts and static content
- **KMS**: For encryption of sensitive data (optional)

## 🧪 Testing

### Automated API Testing

Each service contains its own tests. Run tests for all services:

```bash
# Run all tests
./scripts/test-endpoints.sh

# Test individual endpoints
./scripts/test-endpoints.sh -e entries -r us-east-1
```

The test script performs comprehensive testing including:
- Creating, retrieving, updating, and deleting resources
- Testing search and filtering capabilities
- Testing specialized API endpoints
- Validating responses against expected schemas

### Debugging Tests

All API requests and responses are logged for debugging:

```bash
# View logs in the logs directory
cat ./logs/test_logs/create_entry-response.json
```

### Load Testing

The test script also supports load testing:

```bash
# Run load tests
./scripts/test-endpoints.sh -l -c 10 -n 100
```

## 🔧 Configuration

Environment-specific configuration is managed through:

1. **CloudFormation Parameters**: Set during deployment
2. **Environment Variables**: Passed to Lambda functions
3. **SSM Parameter Store**: For sensitive configuration

Key configuration options:
- `Stage`: Deployment environment (dev, staging, prod)
- `JwtSecret`: Secret for signing JWT tokens
- `LogLevel`: Logging verbosity

## 📝 API Documentation

API documentation is available after deployment:

- REST API documentation: `https://<api-id>.execute-api.<region>.amazonaws.com/<stage>/api-docs`

For detailed API specifications, see our [API Documentation](./infrastructure/docs/api.md).

## 🔄 Service Communication

Services communicate through:

1. **Synchronous Communication**: API Gateway for direct service-to-service communication
2. **Asynchronous Communication**: EventBridge for event-driven architecture
3. **Database Access**: Each service has domain-specific DynamoDB access

## 🛡️ Security

- **JWT Authentication**: Custom Lambda authorizer
- **IAM Roles**: Least-privilege permissions for each service
- **API Gateway**: Request validation and throttling
- **Input Validation**: Parameter validation for all endpoints
- **CloudWatch Logs**: For audit trail and troubleshooting
- **KMS Integration**: Optional encryption for sensitive data
- **S3 Encryption**: All deployment buckets use server-side encryption
- **Resource Tagging**: All AWS resources are tagged for better management
- **Credential Management**: AWS credentials are validated before use
- **Secure Communication**: All API endpoints use HTTPS

## 🔍 Troubleshooting

Common issues and solutions:

1. **AWS Credentials Not Found**
   ```bash
   aws configure
   ```

2. **SAM CLI Not Found**
   ```bash
   pip install aws-sam-cli
   ```

3. **musl-cross Issues**
   ```bash
   # Check where musl-cross is installed
   brew --prefix musl-cross
   
   # Ensure the bin directory is in your PATH
   export PATH="$(brew --prefix musl-cross)/bin:$PATH"
   
   # Reinstall with aarch64 target
   brew reinstall FiloSottile/musl-cross/musl-cross --with-aarch64
   ```

4. **OpenSSL Detection Issues**
   ```bash
   # Check OpenSSL installation
   which openssl
   openssl version
   
   # For OpenSSL errors, verify OPENSSL_DIR is set correctly
   echo $OPENSSL_DIR
   
   # You can manually set the environment variable
   export OPENSSL_DIR="/usr/local"  # or the correct path for your system
   ```

5. **Ring/aws-lc-sys Cross-Compilation Errors (Illegal Instruction on Lambda)**

   If your Lambda functions crash with `Runtime.ExitError: signal: illegal instruction`, the issue is that the binary contains x86 CPU instructions that don't work on ARM64 Lambda.

   **Root Cause**: The default Zig cross-compiler in cargo-lambda doesn't properly handle crates with C components (like `ring`, `aws-lc-sys`).

   **Solution**: Use the `cross` compiler instead of Zig:
   ```bash
   # CORRECT - Use cross compiler for ARM64
   cargo lambda build --compiler cross --arm64 --release

   # INCORRECT - This may produce binaries with x86 instructions
   cargo lambda build --arm64 --release
   cargo lambda build --target aarch64-unknown-linux-musl --release
   ```

   **Prerequisites for cross compiler**:
   - Docker must be installed and running
   - The `cross` tool: `cargo install cross`

   **Why this works**: The `cross` compiler runs the build inside a Docker container with the correct ARM64 toolchain, ensuring all C code (including ring's crypto) is compiled for the correct architecture.

   For more details, see:
   - [Cargo Lambda Cross-Compiling Guide](https://www.cargo-lambda.info/guide/cross-compiling.html)
   - [AWS Lambda Rust Documentation](https://docs.aws.amazon.com/lambda/latest/dg/rust-package.html)

6. **Deployment Failures**
   ```bash
   # Check CloudFormation events
   aws cloudformation describe-stack-events \
     --stack-name reflekt-journal-dev
   ```

7. **Test Failures**
   ```bash
   # Run with verbose output
   ./scripts/test-endpoints.sh -v
   
   # Check specific endpoint
   curl -v $API_URL/health
   ```

8. **Debugging with Detailed Output**
   ```bash
   # Run scripts with debug output
   DEBUG=true ./scripts/build-all.sh
   ```

## 👨‍💻 Author

**Eric Gitangu (Deveric)**
- Email: [developer.ericgitangu@gmail.com](mailto:developer.ericgitangu@gmail.com)
- Website: [https://developer.ericgitangu.com](https://developer.ericgitangu.com)

---

## 📚 Additional Resources

- [Frontend Repository](../frontend)
- [Architecture Diagram](./infrastructure/docs/architecture.md)
- [API Documentation](./infrastructure/docs/api.md)
- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)
