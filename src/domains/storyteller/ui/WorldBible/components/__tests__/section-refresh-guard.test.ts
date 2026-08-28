/**
 * The Writers Room is a single conversation. A section refresh fired while the
 * assistant is mid-turn crashes the thread — which is what
 * `isGenerationActivityBusy` exists to prevent.
 *
 * The predicate was written, and then applied in exactly one section
 * (`BiblePlotTwists`) while the shared chrome every *other* section renders
 * disabled only on its own `isLoading`. So the refresh button stayed clickable
 * throughout a streaming turn.
 *
 * There is no component-test harness in this repo (vitest runs in `node`), so
 * the rule is pinned structurally: any World Bible component that draws a
 * refresh button must consult the predicate.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const COMPONENTS = 'src/domains/storyteller/ui/WorldBible/components'
const REFRESH_ICON = 'RefreshCw'
const BUSY_PREDICATE = 'isGenerationActivityBusy'

function componentsDrawingRefresh(): string[] {
  return readdirSync(COMPONENTS)
    .filter(entry => entry.endsWith('.tsx'))
    .filter(entry => readFileSync(join(COMPONENTS, entry), 'utf8').includes(REFRESH_ICON))
}

describe('World Bible section refresh', () => {
  it('is drawn by components that all consult the chat-busy predicate', () => {
    const missing = componentsDrawingRefresh().filter(
      entry => !readFileSync(join(COMPONENTS, entry), 'utf8').includes(BUSY_PREDICATE)
    )

    expect(missing).toEqual([])
  })

  it('has at least one such component, so the check cannot pass vacuously', () => {
    expect(componentsDrawingRefresh().length).toBeGreaterThan(0)
  })
})
