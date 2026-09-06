import { defineConfig } from 'vitest/config'
import path from 'path'
import {
  VITEST_COVERAGE_EXCLUDE,
  VITEST_COVERAGE_INCLUDE,
  VitestCoverageProvider,
  VitestCoverageReporter,
  VitestCoverageReportsDir,
  VitestEnvFile,
  VitestEnvironment,
} from './vitest.config.constants'

export default defineConfig({
  test: {
    globals: true,
    environment: VitestEnvironment.Node,
    setupFiles: ['dotenv/config'],
    dangerouslyIgnoreUnhandledErrors: false,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.e2e.test.{ts,tsx}',
      // Playwright owns `e2e/`. Vitest's default include matches `*.spec.ts`,
      // so without this it collects them and dies on `test.describe()`.
      'e2e/**',
      // Live OpenRouter smokes — `npm run test:smoke:openrouter` (needs a key)
      '**/openrouter-smoke.test.ts',
      // Live Trigger / provider smokes — run via `npm run test:smoke:tile-providers`
      '**/*.tests.ts',
      // Intentional unhandled-rejection probe — spawned by unhandled-rejection-gate.test.ts
      'scripts/gate-fixtures/unhandled-rejection.test.ts',
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
    coverage: {
      provider: VitestCoverageProvider.V8,
      // v8 remaps uncovered files as JS; non-ts (md, .DS_Store) crash the report
      reportOnFailure: true,
      include: [...VITEST_COVERAGE_INCLUDE],
      exclude: [...VITEST_COVERAGE_EXCLUDE],
      reporter: [
        VitestCoverageReporter.TextSummary,
        VitestCoverageReporter.Html,
        VitestCoverageReporter.JsonSummary,
        VitestCoverageReporter.LcovOnly,
      ],
      reportsDirectory: VitestCoverageReportsDir.Root,
      thresholds: {
        'src/domains/storyteller/ai/tools/search-manuscript-embed.ts': {
          lines: 50,
          functions: 50,
          statements: 50,
          branches: 40,
        },
        'src/domains/storyteller/core/knowledge-ledger/check-knowledge-ledger.ts': {
          lines: 50,
          functions: 50,
          statements: 50,
          branches: 40,
        },
        'src/domains/storyteller/core/promote-rule/promoted-rule.ts': {
          lines: 50,
          functions: 50,
          statements: 50,
          branches: 40,
        },
        'src/domains/storyteller/core/workflow/queued-verdicts.ts': {
          lines: 50,
          functions: 50,
          statements: 50,
          branches: 40,
        },
      },
    },
  },
})
