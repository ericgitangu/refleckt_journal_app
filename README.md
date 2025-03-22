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
- Secure authentication
- Private, encrypted content
- User-controlled data sharing

## 🏗️ Architecture

Reflekt uses a modern, decoupled architecture:

### Frontend
- Next.js App Router for routing and SSR
- React components with Hooks
- SWR and Jotai for state management
- shadcn/ui components for UI

### Backend
- AWS Serverless architecture (Lambda, API Gateway)
- Microservices organized by domain
- Event-driven communication with EventBridge
- DynamoDB for persistent storage
- Custom JWT authentication

For detailed architecture diagrams:
- [Frontend Architecture](frontend/README.md)
- [Backend Architecture](backend/infrastructure/docs/architecture.md)

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: React 18, shadcn/ui, Tailwind CSS 4
- **State**: Jotai, SWR
- **API Communication**: tRPC, Apollo Client
- **Authentication**: NextAuth.js
- **Languages**: TypeScript, CSS

### Backend
- **Compute**: AWS Lambda
- **API**: AWS API Gateway
- **Database**: Amazon DynamoDB
- **Events**: Amazon EventBridge
- **AI Services**: Amazon Comprehend
- **Infrastructure**: AWS SAM, CloudFormation
- **Languages**: Node.js

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- Yarn package manager
- AWS CLI (for backend deployment)
- AWS SAM CLI (for backend local development)
- AWS Account (for deployment)

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

4. Start the frontend development server:
   ```bash
   cd ../frontend
   yarn dev
   ```

5. Start the backend services locally:
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

### Frontend Deployment
The frontend is optimized for deployment on Vercel:

```bash
cd frontend
vercel --prod
```

### Backend Deployment
The backend is deployed to AWS using SAM:

```bash
cd backend
sam build --template-file infrastructure/template.yaml
./scripts/deploy-stack.sh -s prod -r us-east-1
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
