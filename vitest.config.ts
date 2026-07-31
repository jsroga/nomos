import { defineConfig } from 'vitest/config'
import path from 'path'
import { VitestEnvFile, VitestEnvironment } from './vitest.config.constants'

export default defineConfig({
  test: {
    globals: true,
    environment: VitestEnvironment.Node,
    setupFiles: ['dotenv/config'],
    dangerouslyIgnoreUnhandledErrors: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.e2e.test.{ts,tsx}',
      // Live Trigger / provider smokes — run via `npm run test:smoke:tile-providers`
      '**/*.tests.ts',
    ],
    env: {
      DOTENV_CONFIG_PATH: VitestEnvFile.Local,
    },
    alias: {
      '@/evals': path.resolve(__dirname, './evals'),
      '@': path.resolve(__dirname, './src'),
    },
  },
})
