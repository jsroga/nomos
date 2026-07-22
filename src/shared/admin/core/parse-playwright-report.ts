/**
 * Parse a Playwright JSON report into a flat summary for the admin Tests
 * dashboard (Track A3). Pure — walks the nested suite tree without DB/fs.
 */

import { isPlainObject, readString, readNumber } from '@/shared/data/json-guards'

export interface TestSpecResult {
  title: string
  file: string
  status: string
  durationMs: number
}

export interface TestReportSummary {
  total: number
  passed: number
  failed: number
  skipped: number
  flaky: number
  startedAt: string | null
  durationMs: number
  specs: TestSpecResult[]
}

const STATUS_EXPECTED = 'expected'
const STATUS_UNEXPECTED = 'unexpected'
const STATUS_SKIPPED = 'skipped'
const STATUS_FLAKY = 'flaky'
const STATUS_PASSED = 'passed'
const STATUS_FAILED = 'failed'

/** Flatten a Playwright report JSON into a summary. Tolerant of missing fields. */
export function parsePlaywrightReport(raw: unknown): TestReportSummary {
  const root = isPlainObject(raw) ? raw : {}
  const specs: TestSpecResult[] = []
  collectSpecs(root.suites, specs)

  const counts = { passed: 0, failed: 0, skipped: 0, flaky: 0, durationMs: 0 }
  for (const spec of specs) {
    counts.durationMs += spec.durationMs
    if (spec.status === STATUS_PASSED) counts.passed += 1
    else if (spec.status === STATUS_FAILED) counts.failed += 1
    else if (spec.status === STATUS_SKIPPED) counts.skipped += 1
    else if (spec.status === STATUS_FLAKY) counts.flaky += 1
  }

  const stats = isPlainObject(root.stats) ? root.stats : {}

  return {
    total: specs.length,
    passed: counts.passed,
    failed: counts.failed,
    skipped: counts.skipped,
    flaky: counts.flaky,
    startedAt: readString(stats.startTime) ?? null,
    durationMs: readNumber(stats.duration) ?? counts.durationMs,
    specs,
  }
}

function collectSpecs(suites: unknown, out: TestSpecResult[]): void {
  if (!Array.isArray(suites)) return
  for (const suite of suites) {
    if (!isPlainObject(suite)) continue
    const file = readString(suite.file) ?? ''
    collectSuiteSpecs(suite.specs, file, out)
    collectSpecs(suite.suites, out)
  }
}

function collectSuiteSpecs(specs: unknown, file: string, out: TestSpecResult[]): void {
  if (!Array.isArray(specs)) return
  for (const spec of specs) {
    if (!isPlainObject(spec)) continue
    out.push({
      title: readString(spec.title) ?? '',
      file,
      status: specStatus(spec),
      durationMs: specDuration(spec),
    })
  }
}

function specStatus(spec: Record<string, unknown>): string {
  if (spec.ok === false) return STATUS_FAILED
  const tests = Array.isArray(spec.tests) ? spec.tests : []
  for (const test of tests) {
    if (!isPlainObject(test)) continue
    const status = readString(test.status)
    if (status === STATUS_UNEXPECTED) return STATUS_FAILED
    if (status === STATUS_FLAKY) return STATUS_FLAKY
    if (status === STATUS_SKIPPED) return STATUS_SKIPPED
    if (status === STATUS_EXPECTED) return STATUS_PASSED
  }
  return STATUS_PASSED
}

function specDuration(spec: Record<string, unknown>): number {
  const tests = Array.isArray(spec.tests) ? spec.tests : []
  let total = 0
  for (const test of tests) {
    if (!isPlainObject(test)) continue
    const results = Array.isArray(test.results) ? test.results : []
    for (const result of results) {
      if (isPlainObject(result)) total += readNumber(result.duration) ?? 0
    }
  }
  return total
}
