import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  StorytellerHeaderClass,
  StorytellerHeaderCopy,
  StorytellerHeaderSlotId,
} from '../storyteller-module-header'

const HEADER_SRC = 'src/domains/storyteller/ui/StorytellerLayout/shared/StorytellerEpisodeHeader.tsx'
const PANEL_SRC = 'src/domains/storyteller/ui/StorytellerLayout/shared/StorytellerCenterPanelCore.tsx'
const BIBLE_PANEL_SRC = 'src/domains/storyteller/ui/WorldBiblePanel/WorldBiblePanel.tsx'

describe('storyteller module header slots', () => {
  it('keeps distinct bible and episode chrome hosts', () => {
    expect(StorytellerHeaderSlotId.BibleChrome).not.toBe(StorytellerHeaderSlotId.EpisodeChrome)
    expect(StorytellerHeaderCopy.EditingEpisode).not.toBe(StorytellerHeaderCopy.EditingBible)
    expect(StorytellerHeaderCopy.Episodes).not.toBe(StorytellerHeaderCopy.Storybible)
  })

  it('hides the inactive chrome host with display none, not a second flex row', () => {
    expect(StorytellerHeaderClass.ChromeSlot).toContain('flex-1')
    expect(StorytellerHeaderClass.Hidden).toBe('hidden')
    expect(StorytellerHeaderClass.Hidden).not.toContain('flex')
    expect(StorytellerHeaderClass.BibleLayer).toContain('flex')
  })

  it('keeps both chrome hosts mounted in original order: bible slot, phase nav, episode slot', () => {
    const src = readFileSync(HEADER_SRC, 'utf8')
    const bible = src.indexOf('StorytellerHeaderSlotId.BibleChrome')
    const trail = src.indexOf('<EpisodePhaseTrail')
    const episode = src.indexOf('StorytellerHeaderSlotId.EpisodeChrome')
    expect(bible).toBeGreaterThan(-1)
    expect(trail).toBeGreaterThan(bible)
    expect(episode).toBeGreaterThan(trail)
    expect(src).toContain('isWorldBibleOpen ? StorytellerHeaderClass.ChromeSlot : StorytellerHeaderClass.Hidden')
    expect(src).toContain('!isWorldBibleOpen ? StorytellerHeaderClass.ChromeSlot : StorytellerHeaderClass.Hidden')
    expect(src).toContain('{isWorldBibleOpen ? null : (')
  })

  it('keeps the bible layer mounted without a fade when switching context', () => {
    const src = readFileSync(PANEL_SRC, 'utf8')
    expect(src).toContain('StorytellerHeaderClass.BibleLayer')
    expect(src).toContain('StorytellerHeaderClass.Hidden')
    expect(src).not.toMatch(/\{isWorldBibleOpen &&/)
    expect(src).not.toContain('animate-in')
    expect(src).toContain('if (currentEpisodeId)')
    expect(src).toContain('setWorldBibleOpen(false)')
  })

  it('keeps bible header chrome mounted while the body shimmers', () => {
    const src = readFileSync(BIBLE_PANEL_SRC, 'utf8')
    expect(src).toContain('WorldBiblePanelHeader')
    expect(src).toContain('isLoading ? (')
    expect(src).not.toMatch(/if \(isLoading\) \{\s*return <WorldBiblePanelLoading/)
  })
})
