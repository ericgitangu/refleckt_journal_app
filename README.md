# ✨ Reflekt

A modern, AI-powered journaling application with Next.js frontend and serverless Rust microservices on AWS.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://refleckt.vercel.app)
[![Backend](https://img.shields.io/badge/backend-AWS-orange)](https://aws.amazon.com)
[![Frontend](https://img.shields.io/badge/frontend-Vercel-black)](https://vercel.com)

## 📚 Table of Contents

- [🌟 Overview](#-overview)
- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🛠️ Tech Stack](#️-tech-stack)
- [🚀 Quick Start](#-quick-start)
- [💻 Development](#-development)
- [☁️ Deployment](#️-deployment)
- [💰 Cost Estimation](#-cost-estimation)
- [👨‍💻 Author](#-author)

## 🌟 Overview

Reflekt is a personal journaling application featuring AI-powered insights, sentiment analysis, and reflective question generation. Built with a multi-tenant serverless architecture for scalability and cost efficiency.

**🔗 Live:** [https://refleckt.vercel.app](https://refleckt.vercel.app)

## ✨ Features

| Category | Features |
|----------|----------|
| 📔 **Journal** | CRUD entries, rich text, tags, search, export (JSON/Markdown) |
| 🧠 **AI Insights** | Sentiment analysis, keyword extraction, reflective questions |
| 📊 **Analytics** | Mood tracking, writing patterns, streaks, category trends |
| 🎨 **UI/UX** | Dark/light mode, responsive design, minimalist interface |
| 🔒 **Security** | JWT auth, multi-tenant isolation, encrypted data |

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────────────────────────────┐
│   Next.js 14    │────▶│           AWS API Gateway               │
│   (Vercel)      │     │         + Lambda Authorizer             │
└─────────────────┘     └──────────────┬──────────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        ▼                              ▼                              ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│ Entry Service │          │Settings Service│          │Analytics Svc  │
│   (Rust)      │          │   (Rust)      │          │   (Rust)      │
└───────┬───────┘          └───────────────┘          └───────────────┘
        │
        │ EventBridge
        ▼
┌───────────────┐          ┌───────────────┐
│  AI Service   │          │Prompts Service│
│   (Rust)      │          │   (Rust)      │
└───────────────┘          └───────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                      DynamoDB Tables                         │
│  entries | insights | settings | categories | prompts        │
└─────────────────────────────────────────────────────────────┘
```

### 🏢 Multi-Tenant Design

- **Partition Strategy:** `tenant_id` + `user_id` composite keys
- **Data Isolation:** JWT-enforced tenant boundaries
- **GSI Pattern:** Efficient cross-tenant queries with UserIndex

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | Rust (ARM64), AWS Lambda, API Gateway, DynamoDB |
| **AI** | Anthropic API (claude-3-haiku) |
| **Events** | Amazon EventBridge |
| **Auth** | JWT + Custom Lambda Authorizer |
| **IaC** | AWS SAM / CloudFormation |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+, Yarn
- Rust 1.85.0+
- AWS CLI + SAM CLI
- Vercel CLI (optional)

### Frontend

```bash
cd frontend
cp .env.example .env.local
yarn install && yarn dev
```

### Backend

```bash
cd backend
source ./scripts/set_env.sh
make build-all
./scripts/deploy-stack.sh -s dev -r us-east-1
```

## 💻 Development

| Command | Description |
|---------|-------------|
| `yarn dev` | Start frontend (localhost:3000) |
| `yarn test` | Run Jest tests |
| `yarn cypress:headless` | E2E tests |
| `make build-all` | Build all Rust services |
| `sam local start-api` | Local API Gateway |

## ☁️ Deployment

### Backend (AWS)

```bash
cd backend
source ./scripts/set_env.sh
./scripts/deploy-stack.sh -s prod -r us-east-1
```

### Frontend (Vercel)

```bash
cd frontend
vercel --prod
```

## 💰 Cost Estimation

**Low Traffic (~1K users, ~10K req/month):**

| Service | Cost/Month |
|---------|------------|
| Lambda (ARM64) | ~$0.50 |
| API Gateway | ~$3.50 |
| DynamoDB (on-demand) | ~$2.00 |
| EventBridge | ~$0.01 |
| Anthropic API | ~$1.00 |
| **Total** | **~$7/month** |

*Vercel Hobby tier: Free*

## 📁 Project Structure

```
reflekt-journal-app/
├── frontend/           # Next.js 14 App Router
│   ├── app/           # Pages & API routes
│   ├── components/    # React components
│   └── lib/           # Utilities
├── backend/           # Rust microservices
│   ├── entry-service/
│   ├── ai-service/
│   ├── analytics-service/
│   ├── settings-service/
│   ├── prompts-service/
│   ├── authorizer/
│   └── infrastructure/ # SAM templates
└── docs/              # Documentation
```

## 👨‍💻 Author

**Eric Gitangu (Deveric)**

[![Email](https://img.shields.io/badge/email-developer.ericgitangu%40gmail.com-blue)](mailto:developer.ericgitangu@gmail.com)
[![Website](https://img.shields.io/badge/website-developer.ericgitangu.com-green)](https://developer.ericgitangu.com)

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.
