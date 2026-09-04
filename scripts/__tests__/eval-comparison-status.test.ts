import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  evalComparisonStatus,
  EvalComparisonStatus,
} from '../eval-comparison-status.mjs'

describe('evalComparisonStatus', () => {
  it('treats a missing passed key as skipped, not passed', () => {
    expect(evalComparisonStatus({})).toBe(EvalComparisonStatus.Skipped)
    expect(evalComparisonStatus(null)).toBe(EvalComparisonStatus.Skipped)
    expect(evalComparisonStatus({ inputHash: 'abc' })).toBe(EvalComparisonStatus.Skipped)
  })

  it('passes only when passed is true', () => {
    expect(evalComparisonStatus({ passed: true })).toBe(EvalComparisonStatus.Passed)
  })

  it('fails when passed is false', () => {
    expect(evalComparisonStatus({ passed: false })).toBe(EvalComparisonStatus.Failed)
  })
})

describe('check-eval-freshness', () => {
  it('exits non-zero when the artifact has passed: false', () => {
    const dir = mkdtempSync(join(tmpdir(), 'eval-freshness-'))
    const artifact = join(dir, 'latest.json')
    writeFileSync(artifact, JSON.stringify({ comparison: { passed: false } }))

    expect(() =>
      execFileSync('node', ['scripts/check-eval-freshness.mjs'], {
        cwd: process.cwd(),
        env: { ...process.env, EVAL_RESULT_FILE: artifact },
        encoding: 'utf8',
        stdio: 'pipe',
      })
    ).toThrow()
  })

  it('exits zero when passed is missing and inputHash matches', () => {
    const dir = mkdtempSync(join(tmpdir(), 'eval-freshness-'))
    const artifact = join(dir, 'latest.json')
    const currentHash = execFileSync(
      'node',
      [
        '--input-type=module',
        '-e',
        'import { inputHash } from \'./evals/input-hash.mjs\'; process.stdout.write(inputHash())',
      ],
      { cwd: process.cwd(), encoding: 'utf8' }
    )
    writeFileSync(artifact, JSON.stringify({ inputHash: currentHash }))

    const output = execFileSync('node', ['scripts/check-eval-freshness.mjs'], {
      cwd: process.cwd(),
      env: { ...process.env, EVAL_RESULT_FILE: artifact },
      encoding: 'utf8',
    })
    expect(output).toContain('skipped (not a pass)')
  })

  it('exits non-zero when inputHash is stale', () => {
    const dir = mkdtempSync(join(tmpdir(), 'eval-freshness-'))
    const artifact = join(dir, 'latest.json')
    writeFileSync(artifact, JSON.stringify({ inputHash: 'stale-hash-fixture' }))

    expect(() =>
      execFileSync('node', ['scripts/check-eval-freshness.mjs'], {
        cwd: process.cwd(),
        env: { ...process.env, EVAL_RESULT_FILE: artifact },
        encoding: 'utf8',
        stdio: 'pipe',
      })
    ).toThrow(/inputHash mismatch/)
  })
})
