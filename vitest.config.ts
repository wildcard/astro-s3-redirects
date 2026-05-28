import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // globals:true is required for the aws-sdk-client-mock-jest/vitest matchers
    // (e.g. expect(s3).toHaveReceivedCommandWith(...)).
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
    },
  },
});
