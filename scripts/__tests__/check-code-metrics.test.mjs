import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { checkCodeMetrics } from '../check-code-metrics.mjs'

describe('checkCodeMetrics', () => {
  it('flags file line count and cyclomatic complexity thresholds', () => {
    const dir = mkdtempSync(join(tmpdir(), 'code-metrics-'))
    const filePath = join(dir, 'sample.ts')

    try {
      const lines = Array.from({ length: 810 }, (_, index) =>
        index === 400
          ? 'export function complex(v: number) { if (v > 0) return 1; if (v < 0) return -1; return 0 }'
          : `const line${index} = ${index}`,
      )
      writeFileSync(filePath, `${lines.join('\n')}\n`)

      const result = checkCodeMetrics({ files: [filePath] })

      expect(result.errors.some((message) => message.includes('810 lines'))).toBe(true)
      expect(result.warnings.some((message) => message.includes('810 lines'))).toBe(false)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('passes small simple files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'code-metrics-'))
    const filePath = join(dir, 'small.ts')

    try {
      writeFileSync(
        filePath,
        `export function add(a: number, b: number) {\n  return a + b\n}\n`,
      )

      const result = checkCodeMetrics({ files: [filePath] })
      expect(result.errors).toEqual([])
      expect(result.warnings).toEqual([])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
