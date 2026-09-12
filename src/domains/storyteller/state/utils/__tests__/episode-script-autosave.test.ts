import { describe, expect, it, vi } from 'vitest'
import { EpisodePatchColumnName } from '@/domains/storyteller/core/io/episode-patch'
import {
  decideEpisodeScriptAutosave,
  EpisodeScriptAutosaveAction,
  persistEpisodeScript,
} from '@/domains/storyteller/state/utils/episode-script-autosave'

vi.mock('@/domains/storyteller/core/io/storyteller.api', () => ({
  patchStorytellerEpisode: vi.fn(),
}))

import { patchStorytellerEpisode } from '@/domains/storyteller/core/io/storyteller.api'

describe('decideEpisodeScriptAutosave', () => {
  it('skips until the fetched episode matches the open episode', () => {
    expect(
      decideEpisodeScriptAutosave({
        episodeId: 'b',
        hydratedEpisodeId: 'a',
        script: 'stale',
        lastPersisted: null,
      }),
    ).toBe(EpisodeScriptAutosaveAction.Skip)
  })

  it('hydrates the first script after fetch without persisting', () => {
    expect(
      decideEpisodeScriptAutosave({
        episodeId: 'a',
        hydratedEpisodeId: 'a',
        script: 'from db',
        lastPersisted: null,
      }),
    ).toBe(EpisodeScriptAutosaveAction.Hydrate)
  })

  it('persists when the draft differs from the last saved value', () => {
    expect(
      decideEpisodeScriptAutosave({
        episodeId: 'a',
        hydratedEpisodeId: 'a',
        script: 'edited',
        lastPersisted: 'from db',
      }),
    ).toBe(EpisodeScriptAutosaveAction.Persist)
  })

  it('skips when the draft already matches the last save', () => {
    expect(
      decideEpisodeScriptAutosave({
        episodeId: 'a',
        hydratedEpisodeId: 'a',
        script: 'from db',
        lastPersisted: 'from db',
      }),
    ).toBe(EpisodeScriptAutosaveAction.Skip)
  })
})

describe('persistEpisodeScript', () => {
  it('patches scriptContent through withAutosave', async () => {
    vi.useFakeTimers()
    const patch = vi.mocked(patchStorytellerEpisode)
    patch.mockResolvedValue(undefined)
    await persistEpisodeScript('ep-1', 'INT. ROOM')
    expect(patch).toHaveBeenCalledWith('ep-1', {
      [EpisodePatchColumnName.ScriptContent]: 'INT. ROOM',
    })
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })
})
