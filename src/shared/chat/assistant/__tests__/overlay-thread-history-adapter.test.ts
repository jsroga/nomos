import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const ADAPTER_SRC = 'src/shared/chat/assistant/thread-history-adapter.ts'

describe('createOverlayThreadHistoryAdapter', () => {
  it('decodes Mastra memory via UI messages instead of requiring StoredEntry rows', () => {
    const src = readFileSync(ADAPTER_SRC, 'utf8')
    expect(src).toContain('mastraMemoryToUiMessages')
    expect(src).toContain('uiMessagesToHistoryEntries')
    expect(src).toContain('createOverlayThreadHistoryAdapter')
    expect(src).not.toMatch(/raw\.filter\(isStoredEntry\)/)
  })
})
