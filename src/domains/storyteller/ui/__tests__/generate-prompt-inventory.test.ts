import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const UI_ROOT = 'src/domains/storyteller/ui'
const SKIP_DIRECTORIES = new Set(['__tests__', '__snapshots__', 'node_modules'])
const INLINE_PROMPT = /onSendMessage\(\s*`/
const INLINE_GENERATE_ATTR = /generatePrompt\s*=\s*["'`]/

function listUiSourceFiles(directory: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(directory)) {
    if (SKIP_DIRECTORIES.has(entry)) continue
    const full = join(directory, entry)
    if (statSync(full).isDirectory()) {
      found.push(...listUiSourceFiles(full))
      continue
    }
    if (!entry.endsWith('.ts') && !entry.endsWith('.tsx')) continue
    if (entry.includes('.test.')) continue
    found.push(full)
  }
  return found
}

describe('storyteller UI generate handlers', () => {
  it('does not embed model-instruction template strings in onSendMessage or generatePrompt', () => {
    const hits: string[] = []
    for (const file of listUiSourceFiles(UI_ROOT)) {
      const source = readFileSync(file, 'utf8')
      if (INLINE_PROMPT.test(source) || INLINE_GENERATE_ATTR.test(source)) {
        hits.push(file)
      }
    }
    expect(hits).toEqual([])
  })
})
