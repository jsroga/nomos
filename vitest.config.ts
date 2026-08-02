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
      // Playwright owns `e2e/`. Vitest's default include matches `*.spec.ts`,
      // so without this it collects them and dies on `test.describe()`.
      'e2e/**',
      // Live Trigger / provider smokes — run via `npm run test:smoke:tile-providers`
      '**/*.tests.ts',
    ],
    env: {
      DOTENV_CONFIG_PATH: VitestEnvFile.Local,
    },
    alias: {
      '@/evals': path.resolve(__dirname, './evals'),
      '@': path.resolve(__dirname, './src'),
      // Next's marker package throws on import outside a Server Component.
      // Storyteller services import it, so any test reaching them dies on load.
      'server-only': path.resolve(__dirname, './empty-module.js'),
    },
  },
})
