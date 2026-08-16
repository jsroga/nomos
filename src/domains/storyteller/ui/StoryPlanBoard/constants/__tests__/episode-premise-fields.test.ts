import { describe, expect, it } from 'vitest'
import {
  EpisodePremiseField,
  EPISODE_PREMISE_RICH_TEXT_FIELDS,
} from '../episode-premise-fields'

describe('EPISODE_PREMISE_RICH_TEXT_FIELDS', () => {
  it('includes title, thematicFocus, and every Ozymandias prose field', () => {
    expect(EPISODE_PREMISE_RICH_TEXT_FIELDS).toEqual(
      expect.arrayContaining([
        EpisodePremiseField.Title,
        EpisodePremiseField.ThematicFocus,
        EpisodePremiseField.Logline,
        EpisodePremiseField.ProtagonistHook,
        EpisodePremiseField.FatalFlaw,
        EpisodePremiseField.Stakes,
        EpisodePremiseField.InevitableConsequence,
      ])
    )
  })
})
