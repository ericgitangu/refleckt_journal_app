const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Custom Jest config with setup for MSW
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/components/(.*)$": "<rootDir>/components/$1",
    "^@/pages/(.*)$": "<rootDir>/pages/$1",
    "^@/hooks/(.*)$": "<rootDir>/hooks/$1",
    "^@/lib/(.*)$": "<rootDir>/lib/$1",
    "^@/utils/(.*)$": "<rootDir>/utils/$1",
    "^@/styles/(.*)$": "<rootDir>/styles/$1",
    "^@/types/(.*)$": "<rootDir>/types/$1",
    "^@/services/(.*)$": "<rootDir>/services/$1",
    "^@/store/(.*)$": "<rootDir>/store/$1",
    "^@/mock/(.*)$": "<rootDir>/mock/$1",
  },
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.test.json",
      },
    ],
  },
  // Allow for msw setup files to work properly
  moduleFileExtensions: ["js", "jsx", "ts", "tsx", "json", "node"],
  // Handle msw node reset
  globalSetup: "<rootDir>/tests/global-setup.js",
  globalTeardown: "<rootDir>/tests/global-teardown.js",
  testTimeout: 30000, // increase timeout for tests that use msw
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
