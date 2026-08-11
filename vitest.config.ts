import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      'astro:content': fileURLToPath(
        new URL('./tests/stubs/astro-content.ts', import.meta.url)
      ),
    },
  },
});
