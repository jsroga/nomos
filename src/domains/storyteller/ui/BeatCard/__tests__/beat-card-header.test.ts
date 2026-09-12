import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const BEAT_CARD = 'src/domains/storyteller/ui/BeatCard/BeatCard.tsx'

describe('BeatCard header', () => {
  it('puts the beat number before the type, clear of the drag handle', () => {
    const src = readFileSync(BEAT_CARD, 'utf8')
    const headerStart = src.indexOf('flex items-center mb-2 gap-2 min-w-0 pr-6')
    expect(headerStart).toBeGreaterThan(-1)
    const header = src.slice(headerStart, headerStart + 900)
    const sequence = header.indexOf('#{displaySequence}')
    const type = header.indexOf('{beatType}')
    expect(sequence).toBeGreaterThan(-1)
    expect(type).toBeGreaterThan(sequence)
    expect(src).not.toContain('justify-between items-center mb-2')
  })
})
