/** Wire values for the Vitest configs (root configs — keep magic strings out of them). */

export enum VitestEnvironment {
  Node = 'node',
}

export enum VitestEnvFile {
  Local = '.env.local',
}

export enum VitestCoverageProvider {
  V8 = 'v8',
}

export enum VitestCoverageReporter {
  TextSummary = 'text-summary',
  Html = 'html',
  JsonSummary = 'json-summary',
  LcovOnly = 'lcovonly',
}

export enum VitestCoverageReportsDir {
  Root = './coverage',
}

export const VITEST_COVERAGE_INCLUDE = ['src/**/*.ts', 'src/**/*.tsx'] as const

export const VITEST_COVERAGE_EXCLUDE = [
  '**/*.{test,spec}.{ts,tsx}',
  '**/*.e2e.test.{ts,tsx}',
  '**/__tests__/**',
  '**/*.d.ts',
] as const
