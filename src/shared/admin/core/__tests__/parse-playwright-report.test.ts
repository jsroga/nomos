import { describe, it, expect } from 'vitest'
import { parsePlaywrightReport } from '../parse-playwright-report'

describe('parsePlaywrightReport', () => {
  it('returns an empty summary for junk input', () => {
    const summary = parsePlaywrightReport(null)
    expect(summary.total).toBe(0)
    expect(summary.specs).toEqual([])
  })

  it('flattens nested suites and counts statuses', () => {
    const report = {
      stats: { startTime: '2026-07-22T00:00:00.000Z', duration: 4200 },
      suites: [
        {
          file: 'smoke.spec.ts',
          specs: [
            { title: 'loads', ok: true, tests: [{ status: 'expected', results: [{ duration: 100 }] }] },
            { title: 'breaks', ok: false, tests: [{ status: 'unexpected', results: [{ duration: 50 }] }] },
          ],
          suites: [
            {
              file: 'smoke.spec.ts',
              specs: [
                { title: 'nested skip', tests: [{ status: 'skipped', results: [] }] },
              ],
            },
          ],
        },
      ],
    }

    const summary = parsePlaywrightReport(report)
    expect(summary.total).toBe(3)
    expect(summary.passed).toBe(1)
    expect(summary.failed).toBe(1)
    expect(summary.skipped).toBe(1)
    expect(summary.startedAt).toBe('2026-07-22T00:00:00.000Z')
    expect(summary.durationMs).toBe(4200)
    expect(summary.specs[0]).toMatchObject({ title: 'loads', file: 'smoke.spec.ts', status: 'passed' })
  })
})
