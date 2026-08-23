/**
 * Jest configuration, wired through `next/jest` so that TypeScript, JSX, CSS
 * modules, `next/font` and the `@/*` path alias all resolve the same way they
 * do in the app itself.
 *
 * https://nextjs.org/docs/app/building-your-application/testing/jest
 */

import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
    // Load next.config.ts and .env files relative to the app root.
    dir: './',
});

const config: Config = {
    clearMocks: true,
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text-summary', 'lcov'],

    // Only our own source counts towards coverage. The Swagger-generated client
    // is vendored and should not be measured or rewritten to satisfy coverage.
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/app/**/layout.tsx',
    ],

    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    // Integration tests hit the live TfNSW API and need a valid key, so they
    // are excluded from `npm test`. Run them with `npm run test:live`.
    testPathIgnorePatterns: ['/node_modules/', '/.next/', '\\.integration\\.test\\.ts$'],
};

export default createJestConfig(config);
