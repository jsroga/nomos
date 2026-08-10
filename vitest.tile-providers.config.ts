import { defineConfig } from 'vitest/config'
import path from 'path'
import { VitestEnvFile, VitestEnvironment } from './vitest.config.constants'

/** Live Trigger generate-tile smokes (OpenRouter Grok + LegNext). */
export default defineConfig({
  test: {
    globals: true,
    environment: VitestEnvironment.Node,
    setupFiles: ['dotenv/config'],
    include: [
      'src/domains/2d-canvas/tasks/smokes/generate-tile-providers.tests.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 300_000,
    hookTimeout: 60_000,
    env: {
      DOTENV_CONFIG_PATH: VitestEnvFile.Local,
    },
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
