import { describe, expect, it } from 'vitest'
import {
  EPISODE_MANAGER_RENAME_LABEL,
  EPISODE_MANAGER_SAVE_LABEL,
} from '../constants/episode-manager'
import {
  EpisodeTitleActionMode,
  episodeTitleActionLabel,
  episodeTitleActionMode,
  shouldPersistEpisodeRename,
} from '../episode-title-action'

const EPISODE_A = 'ep-a'
const EPISODE_B = 'ep-b'

describe('episodeTitleActionMode', () => {
  it('starts in rename mode when no row is being edited', () => {
    const mode = episodeTitleActionMode(null, EPISODE_A)

    expect(mode).toBe(EpisodeTitleActionMode.Rename)
  })

  it('switches the edited row to save mode', () => {
    const mode = episodeTitleActionMode(EPISODE_A, EPISODE_A)

    expect(mode).toBe(EpisodeTitleActionMode.Save)
  })

  it('leaves a sibling row in rename mode', () => {
    const mode = episodeTitleActionMode(EPISODE_A, EPISODE_B)

    expect(mode).toBe(EpisodeTitleActionMode.Rename)
  })
})

describe('episodeTitleActionLabel', () => {
  it('labels the save control while editing', () => {
    const label = episodeTitleActionLabel(EpisodeTitleActionMode.Save)

    expect(label).toBe(EPISODE_MANAGER_SAVE_LABEL)
  })

  it('labels the rename control when idle', () => {
    const label = episodeTitleActionLabel(EpisodeTitleActionMode.Rename)

    expect(label).toBe(EPISODE_MANAGER_RENAME_LABEL)
  })
})

describe('shouldPersistEpisodeRename', () => {
  it('saves a non-empty title', () => {
    const persist = shouldPersistEpisodeRename('Pilot')

    expect(persist).toBe(true)
  })

  it('ignores an empty title so the row is not wiped', () => {
    const persist = shouldPersistEpisodeRename('')

    expect(persist).toBe(false)
  })

  it('ignores whitespace-only titles', () => {
    const persist = shouldPersistEpisodeRename('   ')

    expect(persist).toBe(false)
  })
})
