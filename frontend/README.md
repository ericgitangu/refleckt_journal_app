# ✨ Reflekt Journal App

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-blue)](https://tailwindcss.com/)
[![Unit Tests](https://img.shields.io/badge/Unit%20Tests-passing-brightgreen)](tests/unit)
[![Integration Tests](https://img.shields.io/badge/Integration%20Tests-passing-brightgreen)](tests/integration)
[![E2E Tests](https://img.shields.io/badge/E2E%20Tests-passing-brightgreen)](cypress/e2e)

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
- [🤔 Known Issues and Solutions](#-known-issues-and-solutions)

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

The application uses a comprehensive testing strategy:

- **Unit Tests**: Testing individual components and hooks in isolation
- **Integration Tests**: Testing interactions between components and API
- **End-to-End Tests**: Testing complete user flows

```bash
# Run unit and integration tests with Jest
npm test
# or
yarn test

# Run tests in watch mode during development
npm run test:watch
# or
yarn test:watch

# Generate test coverage report
npm run test:coverage
# or
yarn test:coverage

# Run Cypress E2E tests in browser
npm run cypress
# or
yarn cypress

# Run Cypress tests headlessly (CI)
npm run cypress:headless
# or
yarn cypress:headless

# Run all tests (unit, integration, and E2E)
npm run test:all
# or
yarn test:all
```

Our testing setup includes:

- **Jest**: For unit and integration tests
- **Testing Library**: For component testing
- **Cypress**: For end-to-end testing
- **MSW (Mock Service Worker)**: For API mocking

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

## 🤔 Known Issues and Solutions

### TypeScript constraints with Radix UI components

This project uses Radix UI components which currently have a known type compatibility issue with React's `ElementType` constraints. The specific error is:

```
Type 'ForwardRefExoticComponent<Props>' does not satisfy the constraint 'ElementType<any, keyof IntrinsicElements>'.
  Type 'ForwardRefExoticComponent<Props>' is not assignable to type 'FunctionComponent<any>'.
    Type 'ReactNode' is not assignable to type 'ReactElement<any, any> | null'.
      Type 'undefined' is not assignable to type 'ReactElement<any, any> | null'.
```

#### Root Cause

This occurs because:
1. React's `ElementType` expects components to return `ReactElement | null`
2. But Radix UI components can return `ReactNode` (which includes `undefined`)

#### Current Solution

We're using a two-pronged approach to handle this issue:

1. **Component Level**: Each Radix UI component file includes:
   - `// @ts-nocheck` directive at the top of the file to suppress TypeScript errors
   - `as any` type assertions on forwardRef components
   - Detailed documentation explaining the issue

2. **Project Level**: 
   - ESLint is configured to allow `@ts-nocheck` and `as any` in UI components
   - VS Code settings include configuration to suppress TS2344 errors
   - The build process temporarily ignores TypeScript errors

Example:

```tsx
// @ts-nocheck - Suppress TypeScript errors related to Radix UI components
"use client"

import * as React from "react"
import * as RadixPrimitive from "@radix-ui/react-component"

// Component implementation with type assertions
const Component = React.forwardRef<
  React.ElementRef<typeof RadixPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadixPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadixPrimitive.Root
    ref={ref}
    className={cn("...")}
    {...props}
  />
)) as any;

Component.displayName = RadixPrimitive.Root.displayName;
```

#### For Contributors

When adding new Radix UI components:
1. Include `// @ts-nocheck` at the top of the file
2. Use `as any` type assertions on forwardRef components
3. Document why this is necessary with comments
4. Run `node scripts/add-ts-nocheck.js` to ensure all component files are properly configured
