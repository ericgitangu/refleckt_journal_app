# ✨ Reflekt Journal App

A modern, thoughtful journaling application with a React frontend and serverless AWS backend.

## 📚 Table of Contents

- [🌟 Introduction](#-introduction)
- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🛠️ Technology Stack](#️-technology-stack)
- [🚀 Getting Started](#-getting-started)
- [💻 Development](#-development)
- [🧪 Testing](#-testing)
- [☁️ Deployment](#️-deployment)
- [🔒 Authentication](#-authentication)
- [👨‍💻 Author](#-author)
- [📄 License](#-license)

## 🌟 Introduction

Reflekt is a personal journaling application that helps users capture their thoughts, feelings, and experiences. With a clean, minimalist interface, powerful AI-driven insights, and a scalable serverless architecture, Reflekt makes journaling a pleasure while providing meaningful reflection opportunities.

## ✨ Features

### 📔 Journal Management
- Create, edit, and organize journal entries
- Rich text formatting
- Tag-based organization
- Search through past entries

### 🧠 AI-Powered Insights
- Sentiment analysis of entries
- Topic identification and trends
- Reflective question suggestions
- Entry summaries

### 📊 Analytics and Tracking
- Mood tracking over time
- Journaling frequency statistics
- Topic trends visualization
- Writing patterns analysis

### 🎨 Beautiful UI/UX
- Clean, minimalist interface
- Dark and light mode
- Responsive design (desktop & mobile)
- Customizable themes

### 🔒 Security & Privacy
- Secure authentication with AWS Cognito
- Google OAuth integration
- Private, encrypted content
- User-controlled data sharing

## 🏗️ Architecture

Reflekt uses a modern, decoupled architecture:

### Frontend
- Next.js for routing and SSR
- React components with Hooks
- SWR for state management
- Tailwind CSS for styling

### Backend
- AWS Serverless architecture (Lambda, API Gateway)
- Microservices organized by domain
- Event-driven communication with EventBridge
- DynamoDB for persistent storage
- AWS Cognito for authentication

For detailed architecture diagrams:
- [Frontend Architecture](frontend/README.md)
- [Backend Architecture](backend/infrastructure/docs/architecture.md)

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js
- **UI**: React, Tailwind CSS
- **State**: SWR
- **API Communication**: Axios
- **Authentication**: AWS Cognito
- **Languages**: TypeScript, CSS

### Backend
- **Compute**: AWS Lambda
- **API**: AWS API Gateway
- **Database**: Amazon DynamoDB
- **Events**: Amazon EventBridge
- **AI Services**: Amazon Comprehend
- **Infrastructure**: AWS SAM, CloudFormation
- **Authentication**: AWS Cognito
- **Languages**: Node.js

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Yarn package manager
- AWS CLI (for backend deployment)
- AWS SAM CLI (for backend local development)
- AWS Account (for deployment)
- Google Cloud Project (for OAuth)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/reflekt-journal-app.git
   cd reflekt-journal-app
   ```

2. Install frontend dependencies:
   ```bash
   cd frontend
   yarn install
   ```

3. Install backend dependencies:
   ```bash
   cd ../backend
   # For each service directory
   for dir in */; do
     (cd "$dir" && yarn install)
   done
   ```

4. Set up Google OAuth:
   - Create a project in Google Cloud Console
   - Enable the Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized origins and redirect URIs

5. Start the frontend development server:
   ```bash
   cd ../frontend
   yarn dev
   ```

6. Start the backend services locally:
   ```bash
   cd ../backend
   sam local start-api
   ```

## 💻 Development

### Frontend Development
```bash
cd frontend
yarn dev
```
The application will be available at http://localhost:3000

### Backend Development
```bash
cd backend
sam local start-api
```
The API will be available at http://localhost:3000/api

## 🧪 Testing

### Frontend Tests
```bash
cd frontend
yarn test          # Run unit tests
yarn cypress       # Run E2E tests
```

### Backend Tests
```bash
cd backend
./scripts/test-endpoints.sh  # Test all endpoints
```

## ☁️ Deployment

### Backend Deployment
The backend uses a phased deployment approach:

1. Deploy core infrastructure:
   ```bash
   cd backend
   ./scripts/setup-phased-deployment.sh
   ```

2. Deploy primary services:
   ```bash
   ./scripts/deploy-phased.sh -p primary
   ```

3. Deploy enhanced services:
   ```bash
   ./scripts/deploy-phased.sh -p enhanced
   ```

4. Deploy database:
   ```bash
   ./scripts/deploy-phased.sh -p database
   ```

### Frontend Deployment
The frontend is optimized for deployment on Vercel:

```bash
cd frontend
vercel --prod
```

## 🔒 Authentication

Reflekt uses AWS Cognito for authentication with the following features:

1. **User Pool**: Manages user accounts and authentication
2. **Identity Pool**: Provides temporary AWS credentials
3. **Google Federation**: Allows users to sign in with their Google accounts
4. **JWT Tokens**: Secure authentication tokens for API access

For detailed authentication setup:
- [Authentication Setup Guide](docs/auth-setup.md)
- [Google OAuth Configuration](docs/google-oauth.md)

## 👨‍💻 Author

**Eric Gitangu (Deveric)**
- Email: [developer.ericgitangu@gmail.com](mailto:developer.ericgitangu@gmail.com)
- Website: [https://developer.ericgitangu.com](https://developer.ericgitangu.com)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
