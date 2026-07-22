'use client'

/**
 * Admin → Tests (Track A3). Read-only Playwright results dashboard: KPI counts +
 * a per-spec table from the latest test-results/results.json. Running suites
 * from the UI is a later step.
 */

import { useCallback, useEffect, useState } from 'react'
import type { TestReportSummary } from '@/shared/admin/core/parse-playwright-report'

const API_PATH = '/api/admin/tests'
const LOAD_ERROR_MESSAGE = 'Failed to load test results.'
const EMPTY_MESSAGE = 'No Playwright report yet. Run `npm run test:e2e` to generate one.'
const STATUS_PASSED = 'passed'
const STATUS_FAILED = 'failed'
const CLASS_PASS = 'text-green-600'
const CLASS_FAIL = 'text-red-500'
const CLASS_MUTED = 'opacity-50'

interface TestsResponse {
  available: boolean
  summary: TestReportSummary | null
}

export function TestsDashboard() {
  const [data, setData] = useState<TestsResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(API_PATH)
      if (!res.ok) {
        setLoadError(`Failed to load (${res.status})`)
        return
      }
      setData(await res.json())
    } catch {
      setLoadError(LOAD_ERROR_MESSAGE)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loadError) return <p className="p-6 text-sm text-red-500">{loadError}</p>
  if (!data) return <p className="p-6 text-sm opacity-70">Loading test results…</p>

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-semibold">Tests</h1>
      <p className="mt-1 text-sm opacity-70">Latest Playwright end-to-end run.</p>
      {data.available && data.summary ? (
        <TestsReport summary={data.summary} />
      ) : (
        <p className="mt-6 text-sm opacity-60">{EMPTY_MESSAGE}</p>
      )}
    </div>
  )
}

function TestsReport({ summary }: { summary: TestReportSummary }) {
  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Total" value={summary.total} />
        <Kpi label="Passed" value={summary.passed} tone={STATUS_PASSED} />
        <Kpi label="Failed" value={summary.failed} tone={STATUS_FAILED} />
        <Kpi label="Skipped" value={summary.skipped} />
      </div>

      <div className="mt-6 space-y-1">
        {summary.specs.map((spec, index) => (
          <div
            key={`${spec.file}:${spec.title}:${index}`}
            className="flex items-center justify-between rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/10"
          >
            <div className="min-w-0">
              <div className="truncate font-medium">{spec.title}</div>
              <div className="truncate text-xs opacity-50">{spec.file}</div>
            </div>
            <StatusPill status={spec.status} />
          </div>
        ))}
      </div>
    </>
  )
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: string }) {
  const color = tone === STATUS_PASSED ? CLASS_PASS : tone === STATUS_FAILED ? CLASS_FAIL : ''
  return (
    <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
      <div className="text-xs opacity-60">{label}</div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const color =
    status === STATUS_PASSED ? CLASS_PASS : status === STATUS_FAILED ? CLASS_FAIL : CLASS_MUTED
  return <span className={`text-xs ${color}`}>{status}</span>
}
