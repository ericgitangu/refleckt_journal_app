# ✨ Reflekt Journal App

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-blue)](https://tailwindcss.com/)

A modern, thoughtful journaling app built with Next.js and React.

## 📚 Table of Contents

- [📝 Description](#-description)
- [✨ Features](#-features)
- [🛠️ Technologies](#️-technologies)
- [🚀 Getting Started](#-getting-started)
- [📁 Project Structure](#-project-structure)
- [🎨 UI Components](#-ui-components)
- [🔒 Authentication](#-authentication)
- [🧪 Testing](#-testing)
- [📦 Deployment](#-deployment)
- [📄 License](#-license)

## 📝 Description

Reflekt is a personal journaling application that helps users capture their thoughts, feelings, and experiences. With a clean, minimalist interface and powerful features, Reflekt makes journaling a pleasure.

## ✨ Features

- 📔 **Journal Entries** - Create, edit, and organize journal entries
- 🔍 **Search** - Quickly find entries with full-text search
- 🏷️ **Tags** - Categorize entries with custom tags
- 🌓 **Dark Mode** - Seamless theme switching based on user preference
- 📱 **Responsive Design** - Works beautifully on desktop and mobile
- 🌐 **SEO Optimized** - Dynamic metadata and OpenGraph images
- 📊 **Analytics** - Track your journaling habits (coming soon)
- 🔄 **Offline Support** - Write entries even without internet (coming soon)

## 🛠️ Technologies

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **UI Library**: [React 18](https://reactjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/)
- **State Management**: [Jotai](https://jotai.org/) and [SWR](https://swr.vercel.app/)
- **Backend Communication**: [tRPC](https://trpc.io/) and [Apollo Client](https://www.apollographql.com/docs/react/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **Testing**: Jest, Cypress
- **Fonts**: Montserrat, Inter

## 🚀 Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/reflekt-journal-app.git

# Navigate to the project directory
cd reflekt-journal-app

# Install dependencies
npm install
# or
yarn
# or
pnpm install

# Start the development server
npm run dev
# or
yarn dev
# or
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
frontend/
├── app/              # Next.js App Router
│   ├── api/          # API routes including tRPC and auth
│   ├── journal/      # Journal entry pages
│   ├── providers/    # React context providers
│   ├── globals.css   # Global styles
│   └── layout.tsx    # Root layout with providers
├── components/       # Reusable components
│   ├── ui/           # shadcn/ui components
│   └── journal/      # Journal-specific components
├── hooks/            # Custom React hooks
├── lib/              # Utility functions and API clients
├── public/           # Static assets
├── types/            # TypeScript type definitions
└── tests/            # Test files
```

## 🎨 UI Components

Reflekt uses [shadcn/ui](https://ui.shadcn.com/), a collection of reusable components built with Radix UI and Tailwind CSS. These components are fully accessible and customizable.

Some key components include:

- `Button` - Various button styles for actions
- `Dialog` - Modal dialogs for entry creation/editing
- `Form` - Form components with validation
- `Tabs` - Tabbed interfaces for navigation
- `Toast` - Notifications for user feedback

## 🔒 Authentication

Authentication is handled using NextAuth.js with support for:

- Credentials authentication
- Google OAuth
- Email/password
- JWT tokens for session management

## 🧪 Testing

```bash
# Run unit tests
npm test
# or
yarn test

# Run end-to-end tests
npm run cypress
# or
yarn cypress
```

## 📦 Deployment

The application is optimized for deployment on Vercel, but can be deployed to any platform that supports Next.js.

```bash
# Build for production
npm run build
# or
yarn build

# Start production server
npm start
# or
yarn start
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
