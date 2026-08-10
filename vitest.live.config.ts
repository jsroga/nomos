/**
 * Live integration tier (`npm run test:live`): the `*.e2e.test.ts` files that
 * `vitest.config.ts` excludes because they need a real database, real model keys
 * and a scratch project. Each suite self-skips when its env is absent.
 *
 *   CONTROLLER_E2E_PROJECT_ID=<scratch-uuid> npm run test:live
 */

import { defineConfig } from 'vitest/config'
import path from 'path'
import { VitestEnvFile, VitestEnvironment } from './vitest.config.constants'

/** A live turn plus an LLM judge outlasts the 5s default. */
const LIVE_TEST_TIMEOUT_MS = 120_000

export default defineConfig({
  test: {
    globals: true,
    environment: VitestEnvironment.Node,
    setupFiles: ['dotenv/config'],
    dangerouslyIgnoreUnhandledErrors: true,
    include: ['src/**/*.e2e.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    testTimeout: LIVE_TEST_TIMEOUT_MS,
    hookTimeout: LIVE_TEST_TIMEOUT_MS,
    env: {
      DOTENV_CONFIG_PATH: VitestEnvFile.Local,
    },
    alias: {
      '@/evals': path.resolve(__dirname, './evals'),
      '@': path.resolve(__dirname, './src'),
      'server-only': path.resolve(__dirname, './empty-module.js'),
    },
  },
})
