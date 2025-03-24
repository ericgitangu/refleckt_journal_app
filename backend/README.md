# 🚀 Reflekt Journal App Backend

A serverless microservices-based backend architecture powering the Reflekt Journal application, deployed on AWS.

## 📚 Table of Contents

- [📋 Overview](#-overview)
- [🏗️ Architecture](#️-architecture)
- [🧩 Services](#-services)
- [🛠️ Getting Started](#️-getting-started)
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

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18+)
- Yarn package manager
- AWS CLI configured with appropriate credentials
- AWS SAM CLI

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

3. Start services locally using SAM CLI:
   ```bash
   sam local start-api
   ```

4. For local development with DynamoDB:
   ```bash
   docker run -p 8000:8000 amazon/dynamodb-local
   ```

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

## 🧪 Testing

Each service contains its own tests. Run tests for all services:

```bash
# Run all tests
./scripts/test-endpoints.sh

# Test individual endpoints
./scripts/test-endpoints.sh -e entries -r us-east-1
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
