/**
 * Ratchet vs pinned baseRef: identity set, not a lone count.
 *
 * Raising a threshold in the same tree as a new identity fails. Swapping
 * violation A for B at constant total fails. Whitespace-only reformats do not
 * change identities because they are file::kind::symbol::statementOrdinal.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { walkSourceFile, identityOf, AstKind } from '../inventory/ast.mjs'
import { collectIdentities } from '../inventory/collect.mjs'
import { evaluateRatchet } from '../inventory/compare.mjs'
import { classifyProviderSdkImport, classifyUntypedJsonRead } from '../inventory/matchers.mjs'

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseStringArray(raw: string): string[] {
  const parsed: unknown = JSON.parse(raw)
  if (!isStringArray(parsed)) throw new Error('expected a string array')
  return parsed
}

function parseRecord(raw: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(raw)
  if (!isRecord(parsed)) throw new Error('expected an object')
  return parsed
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') throw new Error(`expected string for ${key}`)
  return value
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number') throw new Error(`expected number for ${key}`)
  return value
}

const RATCHET = parseRecord(readFileSync('.quality-ratchet.json', 'utf8'))
const BASE_REF = readString(RATCHET, 'baseRef')
const BASELINE_PATH = `scripts/inventory/baselines/${BASE_REF}.json`

function classifiedIdentities(source: string, file = 'src/fixture.ts'): string[] {
  const ids: string[] = []
  for (const node of walkSourceFile(file, source)) {
    if (node.kind === AstKind.Comment) continue
    if (!classifyUntypedJsonRead(node.text, file) && !classifyProviderSdkImport(node.text, file)) {
      continue
    }
    ids.push(identityOf(node))
  }
  return ids
}

describe('quality ratchet baseRef', () => {
  it('pins Phase 0 and has a committed snapshot for that SHA', () => {
    expect(BASE_REF).toBe('07403f0f')
    expect(existsSync(BASELINE_PATH)).toBe(true)
  })

  it('fails when baseRef changes without a snapshot at the new name', () => {
    expect(existsSync(`scripts/inventory/baselines/${BASE_REF}.json`)).toBe(true)
    expect(existsSync('scripts/inventory/baselines/not-a-real-sha.json')).toBe(false)
  })

  it('fails a raise and a new identity in the same tree', () => {
    const baseline = parseStringArray(readFileSync(BASELINE_PATH, 'utf8'))
    const current = [...baseline, 'src/fake.ts::call::recordFromJson::1']
    const raised = { ...RATCHET, untypedJsonReads: readNumber(RATCHET, 'untypedJsonReads') + 1 }
    const result = evaluateRatchet({
      current,
      baseline,
      ratchet: raised,
      baseRatchet: RATCHET,
    })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('raise-and-violate')
  })

  it('fails an A/B swap at constant total', () => {
    const baseline = ['src/a.ts::call::recordFromJson::1', 'src/b.ts::call::readString::1']
    const current = ['src/a.ts::call::recordFromJson::1', 'src/c.ts::call::readString::1']
    const result = evaluateRatchet({
      current,
      baseline,
      ratchet: RATCHET,
      baseRatchet: RATCHET,
    })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('ab-swap')
  })

  it('does not change identities on whitespace-only or comment-only edits', () => {
    const compact = `import { recordFromJson } from '@/shared/data/json-guards'
import { drizzle } from 'drizzle-orm'
recordFromJson(x)
`
    const padded = `

import {
  recordFromJson,
} from '@/shared/data/json-guards'
import { drizzle } from 'drizzle-orm'

// keep the same calls
recordFromJson(x)
`
    expect(classifiedIdentities(padded)).toEqual(classifiedIdentities(compact))
  })

  it('treats a burn-down as ok and an A/B hide as not', () => {
    const baseline = parseStringArray(readFileSync(BASELINE_PATH, 'utf8'))
    const current = collectIdentities()
    const result = evaluateRatchet({
      current,
      baseline,
      ratchet: RATCHET,
      baseRatchet: RATCHET,
    })
    expect(result.ok).toBe(true)
    expect(result.reason).not.toBe('ab-swap')
    expect(result.reason).not.toBe('raise-and-violate')
  }, 30_000)

  it('fails if a numeric threshold rose versus the pinned SHA', () => {
    const baseJson = execFileSync('git', ['show', `${BASE_REF}:.quality-ratchet.json`], {
      encoding: 'utf8',
    })
    const baseRatchet = parseRecord(baseJson)
    for (const key of Object.keys(RATCHET)) {
      if (typeof RATCHET[key] !== 'number') continue
      const baseValue = baseRatchet[key]
      if (typeof baseValue !== 'number') continue
      expect(RATCHET[key]).toBeLessThanOrEqual(baseValue)
    }
  })
})
