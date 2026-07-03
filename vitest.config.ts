import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['dotenv/config'],
    dangerouslyIgnoreUnhandledErrors: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'tests/integration/**',
      'tests/system/**',
      '**/*.e2e.test.{ts,tsx}',
    ],
    env: {
      DOTENV_CONFIG_PATH: '.env.local',
    },
    alias: {
      '@': path.resolve(__dirname, './src'),
      'next/server': path.resolve(__dirname, './tests/__mocks__/next-server.ts'),
    },
  },
})
