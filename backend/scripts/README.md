# Backend Scripts

This directory contains various scripts for building, deploying, testing, and managing the backend services.

## Prerequisites

- Node.js (v18+)
- Yarn package manager
- AWS CLI configured with appropriate credentials
- AWS SAM CLI installed
- Apache Benchmark (ab) for load testing
- jq for JSON processing
- curl for HTTP requests
- Docker (for local DynamoDB development)

## Local Development Setup

1. Install dependencies for all services:
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

2. Start local DynamoDB (optional):
   ```bash
   docker run -p 8000:8000 amazon/dynamodb-local
   ```

3. Start services locally:
   ```bash
   sam local start-api
   ```

## Scripts Overview

### Common Utilities (`utils.sh`)

Common utility functions used across all scripts:

```bash
# Source the utilities
source ./utils.sh

# Available functions:
log_info "Message"      # Info level logging
log_success "Message"   # Success level logging
log_warning "Message"   # Warning level logging
log_error "Message"     # Error level logging
log_debug "Message"     # Debug level logging (requires LOG_LEVEL=0)

# AWS utilities
check_aws_credentials  # Verify AWS credentials
check_sam_cli         # Verify SAM CLI installation
validate_aws_region   # Validate AWS region
validate_stack_name   # Validate CloudFormation stack name

# Command execution
run_cmd "command"      # Run command with timeout and logging
wait_for_endpoint     # Wait for HTTP endpoint to become available
```

### Deployment Script (`deploy-stack.sh`)

Deploys the entire backend stack to AWS using SAM/CloudFormation.

```bash
# Basic usage
./deploy-stack.sh -s dev

# Full options
./deploy-stack.sh \
  -n reflekt-journal \  # Stack name
  -s dev \             # Stage (dev/staging/prod)
  -r us-east-1 \       # AWS region
  -b my-deploy-bucket \ # Deployment bucket
  -j my-jwt-secret \   # JWT secret
  -k \                 # Enable KMS encryption
  -t "Key=Value" \     # Additional tags
  -c \                 # Disable cleanup on failure
  -f \                 # Force deployment
  -e                   # Estimate deployment cost
```

### Test Endpoints Script (`test-endpoints.sh`)

Tests all API endpoints with various options for load testing and contract validation.

```bash
# Basic usage
./test-endpoints.sh -a https://api.example.com

# Full options
./test-endpoints.sh \
  -a https://api.example.com \  # API URL
  -t my-jwt-token \            # JWT token for auth
  -v \                         # Verbose output
  -l \                         # Enable load testing
  -d /path/to/test/data \     # Test data directory
  -c 20 \                      # Concurrent users for load test
  -n 1000 \                    # Total requests for load test
  -r \                         # Enable contract validation
  -p \                         # Save responses
  -s 60                        # Request timeout in seconds
```

### Build Script (`build-all.sh`)

Builds all Lambda functions and services.

```bash
# Build all services
./build-all.sh

# Build specific service
./build-all.sh prompts-service

# Build with options
./build-all.sh \
  --clean \           # Clean build directories
  --verify \          # Verify builds
  --parallel         # Parallel builds
```

### Lambda Verification Script (`verify-lambda.sh`)

Verifies Lambda function builds and configurations.

```bash
# Verify all Lambda functions
./verify-lambda.sh

# Verify specific function
./verify-lambda.sh prompts-service

# Verify with options
./verify-lambda.sh \
  --runtime python3.9 \  # Runtime to verify
  --memory 256 \         # Memory configuration
  --timeout 30          # Timeout configuration
```

## AWS Resources

The deployment scripts manage the following AWS resources:

- **API Gateway**: RESTful API with JWT authentication
- **Lambda Functions**: For each microservice
  - Entry Service
  - Analytics Service
  - Settings Service
  - AI Service
  - Authorizer
- **DynamoDB Tables**: For storing entries, settings, categories, and analytics
- **EventBridge**: For service-to-service communication
- **CloudWatch**: For logs and monitoring
- **IAM Roles**: With least-privilege permissions
- **S3 Buckets**: For deployment artifacts and static content
- **KMS**: For encryption of sensitive data (optional)

## Environment Variables

Common environment variables used across scripts:

```bash
# AWS Configuration
AWS_PROFILE=default
AWS_REGION=us-east-1

# API Configuration
API_URL_ENV=https://api.example.com
JWT_SECRET_ENV=your-secret

# Logging
LOG_LEVEL=1  # 0=DEBUG, 1=INFO, 2=WARN, 3=ERROR
```

## Examples

### Deploy and Test

```bash
# Deploy to dev environment
./deploy-stack.sh -s dev -k

# Wait for deployment
sleep 30

# Test the deployed API
./test-endpoints.sh \
  -a $(aws cloudformation describe-stacks \
    --stack-name reflekt-journal-dev \
    --query 'Stacks[0].Outputs[?OutputKey==`JournalApiUrl`].OutputValue' \
    --output text) \
  -l \
  -c 10 \
  -n 100
```

### Build and Verify

```bash
# Clean build all services
./build-all.sh --clean

# Verify Lambda functions
./verify-lambda.sh --runtime python3.9

# Deploy verified functions
./deploy-stack.sh -s dev
```

## Error Handling

All scripts include comprehensive error handling:

- Detailed error messages with stack traces
- Automatic cleanup of resources on failure
- Logging of all operations with timestamps
- Validation of inputs and prerequisites
- Timeout handling for long-running operations

## Security Considerations

The scripts implement several security measures:

- **JWT Authentication**: Custom Lambda authorizer for API Gateway
- **IAM Roles**: Least-privilege permissions for each service
- **API Gateway**: Request validation and throttling
- **Input Validation**: Parameter validation for all endpoints
- **CloudWatch Logs**: For audit trail and troubleshooting
- **KMS Integration**: Optional encryption for sensitive data
- **S3 Encryption**: All deployment buckets use server-side encryption
- **Resource Tagging**: All AWS resources are tagged for better management
- **Credential Management**: AWS credentials are validated before use
- **Secure Communication**: All API endpoints use HTTPS
- **Error Handling**: Sensitive data is not logged in error messages

## Service Communication

The scripts support testing and managing different types of service communication:

1. **Synchronous Communication**
   - API Gateway for direct service-to-service communication
   - RESTful endpoints for CRUD operations
   - Health check endpoints for service monitoring

2. **Asynchronous Communication**
   - EventBridge for event-driven architecture
   - Event testing capabilities in test scripts
   - Event monitoring and debugging tools

3. **Database Access**
   - Each service has domain-specific DynamoDB access
   - Database initialization and migration scripts
   - Data validation and integrity checks

## Contributing

When adding new scripts or modifying existing ones:

1. Use the common utilities from `utils.sh`
2. Follow the existing error handling patterns
3. Add appropriate logging
4. Include command-line options for flexibility
5. Document any new functionality
6. Test thoroughly before committing

## Troubleshooting

Common issues and solutions:

1. **AWS Credentials Not Found**
   ```bash
   aws configure
   ```

2. **SAM CLI Not Found**
   ```bash
   pip install aws-sam-cli
   ```

3. **Build Failures**
   ```bash
   ./build-all.sh --clean
   ```

4. **Deployment Failures**
   ```bash
   # Check CloudFormation events
   aws cloudformation describe-stack-events \
     --stack-name reflekt-journal-dev
   
   # Clean up failed deployment
   aws cloudformation delete-stack \
     --stack-name reflekt-journal-dev
   ```

5. **Test Failures**
   ```bash
   # Run with verbose output
   ./test-endpoints.sh -v
   
   # Check specific endpoint
   curl -v $API_URL/health
   ``` 