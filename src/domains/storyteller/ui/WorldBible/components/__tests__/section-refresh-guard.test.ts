/** Generate icons go through StorytellerRefreshButton, not a raw RefreshCw. */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const COMPONENTS = 'src/domains/storyteller/ui/WorldBible/components'
const REFRESH_ICON = 'RefreshCw'
const REFRESH_BUTTON = 'StorytellerRefreshButton'
const CHAT_REFRESH = 'requestBibleSectionChatRefresh'
const ARTIFACT_DRAFT = 'runBibleSectionArtifactDraft'

function componentsDrawingRefresh(): string[] {
  return readdirSync(COMPONENTS)
    .filter(entry => entry.endsWith('.tsx'))
    .filter(entry => readFileSync(join(COMPONENTS, entry), 'utf8').includes(REFRESH_ICON))
}

describe('World Bible section refresh', () => {
  it('does not draw a raw RefreshCw — all generate icons use StorytellerRefreshButton', () => {
    expect(componentsDrawingRefresh()).toEqual([])
    expect(readFileSync(join(COMPONENTS, 'BibleSectionChrome.tsx'), 'utf8')).toContain(
      REFRESH_BUTTON,
    )
    expect(readFileSync(join(COMPONENTS, 'BiblePlotTwists.tsx'), 'utf8')).toContain(REFRESH_BUTTON)
  })

  it('posts generate through the overlay chat instead of silent artifact-draft', () => {
    const files = readdirSync(COMPONENTS).filter(entry => entry.endsWith('.tsx'))
    const drafts = files.filter(entry =>
      readFileSync(join(COMPONENTS, entry), 'utf8').includes(ARTIFACT_DRAFT)
    )
    expect(drafts).toEqual([])
    expect(readFileSync(join(COMPONENTS, 'BibleSoundtracks.tsx'), 'utf8')).toContain(CHAT_REFRESH)
  })

  it('has chrome and twists as generate hosts, so the check cannot pass vacuously', () => {
    expect(readFileSync(join(COMPONENTS, 'BibleSectionChrome.tsx'), 'utf8')).toContain(
      REFRESH_BUTTON,
    )
  })
})
