import { defineConfig } from 'vitest/config'
import path from 'path'
import { VitestEnvFile, VitestEnvironment } from './vitest.config.constants'

/**
 * Keys-required tier: every `*.e2e.test.ts` — real agents, real models, real DB.
 *
 * The default config excludes this glob so `test:unit` stays hermetic, which
 * also means `npx vitest run <path>` cannot run them (the exclude wins over an
 * explicit filter). This config inverts that: the same files, included.
 *
 *   npm run test:live                      # all of them
 *   npm run test:live -- <path>            # one file
 *
 * Each test self-skips unless its own env is present, so a bare run against a
 * half-configured `.env.local` reports skips rather than failures.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: VitestEnvironment.Node,
    setupFiles: ['dotenv/config'],
    include: ['**/*.e2e.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 300_000,
    hookTimeout: 300_000,
    env: {
      DOTENV_CONFIG_PATH: VitestEnvFile.Local,
    },
    alias: {
      '@/evals': path.resolve(__dirname, './evals'),
      '@': path.resolve(__dirname, './src'),
      // Next's marker package throws when imported outside a Server Component.
      'server-only': path.resolve(__dirname, './empty-module.js'),
    },
  },
})
