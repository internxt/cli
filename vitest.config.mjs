import { coverageConfigDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov'],
      exclude: [
        'bin/',
        'scripts/',
        'src/database/',
        '**/*.types.ts',
        ...coverageConfigDefaults.exclude
      ],
    },
    setupFiles: ['dotenv/config']
  }
});
