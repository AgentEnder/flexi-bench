import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    testTimeout: 15000,
    typecheck: {
      tsconfig: 'tsconfig.spec.json',
    },
  },
});
