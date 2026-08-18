import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import * as entityGraphTypes from '@/domains/storyteller/services/entity-graph-types'
import { ConsistencyCheckKind } from '@/domains/storyteller/services/consistency-types'

const STORYTELLER_ROOT = path.resolve(__dirname, '..', '..')

const FORBIDDEN = [
  'extractRelationshipsFromText',
  'extractViolationKeywords',
  'checkWorldRuleViolations',
  'extractInspirations',
  'extractSoundtrackTracks',
  'inspirationCategoryFromTitle',
  'extractPlaceDescription',
]

function walkTsFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue
      walkTsFiles(full, acc)
      continue
    }
    if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) acc.push(full)
  }
  return acc
}

describe('story-meaning regex scanners', () => {
  it('does not export extractRelationshipsFromText', () => {
    expect('extractRelationshipsFromText' in entityGraphTypes).toBe(false)
  })

  it('keeps WORLD_RULES on the check-kind schema', () => {
    expect(ConsistencyCheckKind.WORLD_RULES).toBe('world_rules')
  })

  it('has no remaining story-meaning regex helpers in storyteller src', () => {
    const files = walkTsFiles(STORYTELLER_ROOT).filter(
      file => !file.includes(`${path.sep}__tests__${path.sep}`)
    )
    const hits: string[] = []
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8')
      for (const name of FORBIDDEN) {
        if (text.includes(name)) hits.push(`${path.relative(STORYTELLER_ROOT, file)}:${name}`)
      }
    }
    expect(hits).toEqual([])
  })

  it('uses structuredOutput objects, not response.text JSON parse', () => {
    const helper = fs.readFileSync(
      path.resolve(STORYTELLER_ROOT, 'ai', 'agents', 'critics', 'generate-structured.ts'),
      'utf8'
    )
    expect(helper.includes('response.object')).toBe(true)
    expect(helper.includes('response.text')).toBe(false)
  })
})
