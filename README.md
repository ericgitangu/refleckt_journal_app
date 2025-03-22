# 🦄 deveric-nextjs-15-scafold-app

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)
[![Jest](https://img.shields.io/badge/Test-Jest-blue.svg)](#testing)
[![Mocha](https://img.shields.io/badge/Test-Mocha-red.svg)](#testing)
[![Cypress](https://img.shields.io/badge/Test-Cypress-orange.svg)](#testing)

![Next.js Logo](https://nextjs.org/static/favicon/favicon-16x16.png)

## 📚 Table of Contents

- [✨ Scaffolding Instructions](#-scaffolding-instructions)
- [📝 Description](#-description)
- [🔧 Installation](#-installation)
- [🚀 Usage](#-usage)
- [🧪 Testing](#-testing)
  - [Unit Tests (Jest)](#unit-tests-jest)
  - [Integration Tests (Mocha)](#integration-tests-mocha)
  - [End-to-End Tests (Cypress)](#end-to-end-tests-cypress)
- [🎉 Features](#-features)
- [🧰 Additional Resources](#-additional-resources)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [📬 Contact](#-contact)
- [🏗️ Project Structure](#-project-structure)
- [📈 Deployment](#-deployment)
- [🧩 Integrations](#-integrations)
- [🛡️ Security](#-security)
- [📦 Packaging](#-packaging)
- [🧹 Maintenance](#-maintenance)
- [📚 References](#-references)
- [👨‍💻 Maintainer](#-maintainer)

## ✨ Scaffolding Instructions

Welcome to the **deveric-nextjs-15-scafold-app**! This project was automatically generated using our custom scaffolding script, designed to streamline the setup process for a robust Next.js application integrated with modern technologies. Below are the detailed steps and capabilities of the script:

### 🛠️ Prerequisites

Before running the scaffolding script, ensure you have the following installed on your system:

- **Node.js** (v18.x or later)
- **Yarn** (v1.22.22) or **npm** (v7.x or later) or **pnpm** (v6.x or later)
- **Git**
- **jq** (for JSON processing)

### 📜 Running the Scaffolding Script

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/EricGitangu/deveric-nextjs-15-scafold-app.git
   ```

2. **Navigate to the Project Directory:**

   ```bash
   cd deveric-nextjs-15-scafold-app
   ```

3. **Make the Script Executable:**

   If the script isn't already executable, grant execute permissions:

   ```bash
   chmod +x next-app.sh
   ```

4. **Run the Setup Script:**

   ```bash
   ./next-app.sh
   ```

   **What the Script Does:**

   - **Scaffolds a Next.js 15 Application:** Initializes a Next.js project with the App Router using a specific version of \`create-next-app\` to ensure compatibility.
   - **Configures React 19:** Implicitly installs React and React-DOM at version 19 to maintain consistency and avoid multiple React instances using the npx create-next-app command.
   - **Installs Major Dependencies:** Adds essential packages such as tRPC, React Query, Prisma, Material UI (with dark mode), NextAuth, and more, ensuring they are compatible with React 19.
   - **Sets Up Development Tools:** Installs development dependencies including TypeScript, ESLint, Prettier, Tailwind CSS, and others for a seamless development experience.
   - **Enforces Single React Version:** Utilizes package manager-specific configurations (\`resolutions\` for Yarn, \`overrides\` for pnpm/npm) to ensure only one instance of React is used across all dependencies.
   - **Deduplicates Dependencies:** Runs deduplication processes to eliminate redundant packages, preventing potential conflicts.
   - **Creates Project Structure:** Sets up necessary folders, hooks, providers, and configuration files.
   - **Generates a Comprehensive README:** Automatically creates a detailed \`README.md\` capturing all aspects of the project setup.
   - **Creates CONTRIBUTING.md & CODE_OF_CONDUCT.md:** Automatically creates detailed \`CONTRIBUTING.md\` & \`CODE_OF_CONDUCT.md\` files.
   - **Creates .gitignore:** Automatically creates a detailed \`.gitignore\` file.
   - **Creates LICENSE:** Automatically creates a detailed \`LICENSE\` file.
   - **Creates tsconfig.json:** Automatically creates a detailed \`tsconfig.json\` file.
   - **Creates next-seo.config.ts:** Automatically creates a detailed \`next-seo.config.ts\` file with aliases configured.
   - **Creates jest.config.js:** Automatically creates a detailed \`jest.config.js\` file.
   - **Creates jest.setup.js:** Automatically creates a detailed \`jest.setup.js\` file.
   - **Creates mocha.config.js:** Automatically creates a detailed \`mocha.config.js\` file.
   - **Creates mocha.opts:** Automatically creates a detailed \`mocha.opts\` file.
   - **Creates cypress/e2e/example.cy.ts:** Automatically creates a detailed \`cypress/e2e/example.cy.ts\` file.
   - **Creates tests/unit/example.test.ts:** Automatically creates a detailed \`tests/unit/example.test.ts\` file.
   - **Creates tests/integration/example.test.ts:** Automatically creates a detailed \`tests/integration/example.test.ts\` file.
   - **Creates pages.tsx and layout.tsx:** Automatically creates detailed \`pages.tsx\` & \`layout.tsx\` files with the relevant providers session, auth, trpc, theme, etc.
   - **Creates globals.css:** Automatically creates a detailed \`globals.css\` file.
   - **Creates prisma/schema.prisma:** Automatically creates a detailed \`prisma/schema.prisma\` file.
   - **Creates public/og-image.png:** Automatically creates a detailed \`public/og-image.png\` file.
   - **Creates scripts/setup.sh:** Automatically creates a detailed \`scripts/setup.sh\` file.
   - **Creates package.json:** Automatically creates a detailed \`package.json\` file.
   - **Creates README.md:** Automatically creates a detailed \`README.md\` file.
   - **Creates components, context, hooks, providers, utils, etc:** Automatically creates detailed \`components, context, hooks, providers, utils, etc.\` files with some pre-configured examples.

### ⚙️ Customizing the Script

The scaffolding script is designed to be flexible. You can adjust variables such as:

- **`PROJECT_NAME`**: Change the default project name.
- **`PKG_MGR`**: Switch between \`yarn\`, \`npm\`, or \`pnpm\` based on your preference.
- **`AUTHOR_NAME`**, **`AUTHOR_EMAIL`**, **`AUTHOR_URL`**: Update contact information in the README.

Feel free to modify the script (\`setup.sh\`) to suit your project's specific needs.

---

## 📝 Description

A **Next.js 15 (App Router)** project with **TypeScript**, **dark-mode** **Material UI**, **tRPC**, **NextAuth**, and **Prisma**. This application is designed to provide a scalable and maintainable foundation for modern web development, leveraging powerful tools and best practices.

---

## 🔧 Installation

Clone the repository and install the dependencies using your preferred package manager.

```bash
git clone https://github.com/EricGitangu/deveric-nextjs-15-scafold-app.git
cd deveric-nextjs-15-scafold-app
yarn install
```

> **Note:** Replace \`yarn install\` with \`npm install\` or \`pnpm install\` if you're using a different package manager.

---

## 🚀 Usage

Start the development server and navigate to [http://localhost:3000](http://localhost:3000) to view the application.

```bash
yarn dev
```

> **Note:** Replace \`yarn dev\` with \`npm run dev\` or \`pnpm dev\` based on your package manager.

---

## 🧪 Testing

This project includes a comprehensive testing setup covering unit, integration, and end-to-end tests.

### Unit Tests (Jest)

Run unit tests to ensure individual components and functions work as expected.

```bash
yarn test
```

### Integration Tests (Mocha)

Execute integration tests to validate the interactions between different parts of the application.

```bash
yarn test:integration
```

### End-to-End Tests (Cypress)

Launch Cypress to perform end-to-end testing, simulating real user interactions.

```bash
yarn cypress:open
```

> **Note:** Ensure the development server is running before executing end-to-end tests.

---

## 🎉 Features

- **Next.js 15 (App Router):** Leverage the latest features of Next.js for building scalable applications.
- **TypeScript:** Enjoy type safety and enhanced developer experience with TypeScript integration.
- **Material UI with Dark Mode:** Implement sleek and responsive UI components with built-in dark mode support.
- **tRPC:** Build end-to-end type-safe APIs effortlessly.
- **NextAuth:** Secure and flexible authentication solutions.
- **Prisma:** Robust database ORM for seamless data management.
- **Tailwind CSS:** Utility-first CSS framework for rapid UI development.
- **ESLint & Prettier:** Maintain code quality and consistency with automated linting and formatting.
- **Turbopack:** Utilize the high-performance bundler for optimized builds.
- **Comprehensive Testing:** Ensure application reliability with Jest, Mocha, and Cypress integrations.

---

## 🧰 Additional Resources

- **[Next.js Documentation](https://nextjs.org/docs)**
- **[Material UI Documentation](https://mui.com/getting-started/installation/)**
- **[tRPC Documentation](https://trpc.io/docs)**
- **[Prisma Documentation](https://www.prisma.io/docs/)**
- **[NextAuth.js Documentation](https://next-auth.js.org/getting-started/introduction)**
- **[Tailwind CSS Documentation](https://tailwindcss.com/docs)**
- **[Jest Documentation](https://jestjs.io/docs/getting-started)**
- **[Mocha Documentation](https://mochajs.org/#getting-started)**
- **[Cypress Documentation](https://docs.cypress.io/guides/overview/why-cypress)**
- **[Turbopack Documentation](https://turbopack.dev/docs/introduction)**
- **[Yarn Resolutions](https://classic.yarnpkg.com/en/docs/selective-version-resolutions/)**
- **[pnpm Overrides](https://pnpm.io/cli/package-overrides)**
- **[npm Overrides](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#overrides)**

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 📬 Contact

**Author:** Eric Gitangu  
**Email:** [developer@ericgitangu.com](mailto:developer@ericgitangu.com)  
**Website:** [https://https://developer.ericgitangu.com](https://https://developer.ericgitangu.com)  
**GitHub:** [EricGitangu](https://github.com/EricGitangu)

---

## 🧪 Testing Instructions

Ensure all tests pass to maintain code integrity and reliability.

### Running All Tests

```bash
yarn test
```

### Running Unit Tests Only

```bash
yarn test:unit
```

### Running Integration Tests Only

```bash
yarn test:integration
```

### Running End-to-End Tests Only

```bash
yarn cypress:open
```

---

## 🏗️ Project Structure

```
deveric-nextjs-15-scafold-app/
├── app/
│   ├── components/
│   │   └── SEO.tsx
│   ├── hooks/
│   │   ├── useTRPC.ts
│   │   └── useTheme.ts
│   ├── providers/
│   │   └── TrpcProvider.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── prisma/
│   └── schema.prisma
├── public/
│   └── og-image.png
├── scripts/
│   └── setup.sh
├── .eslintrc.js
├── .prettierrc
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
├── README.md
└── LICENSE
```

> **Note:** This structure may vary based on your project's specific needs.

---

## 📈 Deployment

1. **Push to GitHub:**
   > **Note:** This script does the initial commit. Create your repo first, e.g, github.com/{AUTHOR_NAME}/{PROJECT_NAME}. Ensure SSH key is added to GitHub and locally ~/.ssh/id_rsa.pub for pull/push access.
   ```bash
   git remote add origin https://github.com/Eric Gitangu/deveric-nextjs-15-scafold-app.git
   git branch -M main
   git push -u origin main
   ```

2. **Connect to Vercel:**

   - Visit [Vercel](https://vercel.com/) and sign in.
   - Import your GitHub repository.
   - Follow the prompts to deploy.

> **Tip:** Ensure environment variables and secrets are correctly configured in your deployment platform.

---

## 🧩 Integrations

- **tRPC:** For building type-safe APIs without the need for a schema or code generation.
- **Prisma:** Simplifies database management with an intuitive ORM.
- **NextAuth:** Provides authentication solutions with support for multiple providers.
- **Material UI:** Offers a comprehensive suite of UI components with theming capabilities.
- **Tailwind CSS:** Enables rapid UI development with utility-first CSS.
- **ESLint & Prettier:** Ensures code quality and consistency across the codebase.
- **Turbopack:** Enhances build performance with an advanced bundler.

---

## 🛡️ Security

- **Dependencies:** Regularly update dependencies to patch known vulnerabilities.
- **Environment Variables:** Securely manage sensitive information using environment variables.
- **Authentication:** Utilize robust authentication mechanisms provided by NextAuth.
- **Dependabot:** Consider using Dependabot to automatically monitor your dependencies.
- **GitHub Actions:** Consider using GitHub Actions for CI/CD and security monitoring.

---

## 📦 Packaging

- **Build Scripts:** Customize build processes in `package.json` as needed.
- **Optimizations:** Leverage Next.js and Turbopack optimizations for production-ready builds.

---

## 🧹 Maintenance

- **Regular Updates:** Keep dependencies and tools up-to-date.
- **Code Reviews:** Implement a code review process to maintain code quality.
- **Documentation:** Continuously update documentation to reflect changes.

---

## 📚 References

> **Note**: Tested with React 19, React-DOM 19 & Next.js 15.

- **[Next.js 15 Documentation](https://nextjs.org/docs/app)**
- **[React 19 Documentation](https://react.dev/reference/react)**
- **[React-DOM 19 Documentation](https://react.dev/reference/react-dom)**
- **[Material UI Documentation](https://mui.com/getting-started/installation/)**
- **[tRPC Documentation](https://trpc.io/docs)**
- **[Prisma Documentation](https://www.prisma.io/docs/)**
- **[NextAuth.js Documentation](https://next-auth.js.org/getting-started/introduction)**

---

## 👨‍💻 Maintainer

- 👤 **Name:** Eric Gitangu
- 📧 **Email:** [developer@ericgitangu.com](mailto:developer@ericgitangu.com)
- 🌐 **Website:** [https://developer.ericgitangu.com](https://developer.ericgitangu.com)
- 🐙 **GitHub:** [EricGitangu](https://github.com/EricGitangu)
- 💼 **LinkedIn:** [linkedin.com/in/ericgitangu](https://linkedin.com/in/ericgitangu)

---
