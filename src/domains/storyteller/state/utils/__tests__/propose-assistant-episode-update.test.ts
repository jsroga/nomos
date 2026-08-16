import { describe, expect, it } from 'vitest'
import { proposeAssistantEpisodeUpdate } from '../propose-assistant-episode-update'
import {
  EPISODE_TOOL_ID,
  ManageToolOperation,
} from '@/domains/storyteller/ai/tools/manage-tools-wire'
import { ActionType, BibleSection } from '@/domains/storyteller/core/types/enums'
import { recordFromJson } from '@/shared/data/json-guards'

const PROJECT_ID = '0696e553-d361-4a36-a839-fb9c5e570e75'
const EPISODE_ID = '8db804d0-1c39-498e-97a5-dfd7eb828789'

const PREMISE = {
  logline: 'A clerk discovers the ledger writes her name in advance.',
  protagonistHook: 'She is asked to certify a death that has not happened.',
  fatalFlaw: 'She trusts the record more than the living.',
  stakes: 'If she signs, the named person can be killed without consequence.',
  inevitableConsequence: 'The ledger names her next.',
}

describe('proposeAssistantEpisodeUpdate', () => {
  it('proposes the premise panel from manage_episode create data.premise', () => {
    const proposal = proposeAssistantEpisodeUpdate(
      {
        toolName: EPISODE_TOOL_ID,
        args: {
          operation: ManageToolOperation.Create,
          projectId: PROJECT_ID,
          data: { title: 'Pilot', premise: PREMISE },
        },
        result: {
          success: true,
          episode: { id: EPISODE_ID, title: 'Pilot', sequence: 1 },
        },
      },
      EPISODE_ID,
    )

    expect(proposal?.section).toBe(BibleSection.EPISODE_PREMISE)
    expect(proposal?.action.type).toBe(ActionType.UPDATE_EPISODE_PREMISE)
    expect(proposal?.preview.premise).toEqual(PREMISE)
  })

  it('proposes from manage_episode update data.premise', () => {
    const proposal = proposeAssistantEpisodeUpdate({
      toolName: EPISODE_TOOL_ID,
      args: {
        operation: ManageToolOperation.Update,
        episodeId: EPISODE_ID,
        data: { title: 'Pilot', premise: { fatalFlaw: PREMISE.fatalFlaw } },
      },
      result: { success: true, episode: { id: EPISODE_ID, title: 'Pilot' } },
    })

    expect(proposal?.section).toBe(BibleSection.EPISODE_PREMISE)
    expect(proposal?.preview.premise).toEqual({ fatalFlaw: PREMISE.fatalFlaw })
    expect(recordFromJson(proposal?.action.payload).episodeId).toBe(EPISODE_ID)
  })

  it('ignores chat wrap-up dumped into a premise field', () => {
    expect(
      proposeAssistantEpisodeUpdate({
        toolName: EPISODE_TOOL_ID,
        args: {
          operation: ManageToolOperation.Update,
          episodeId: EPISODE_ID,
          data: {
            title: 'Pilot',
            premise: {
              logline:
                'I\'ll generate a rich episode premise.\n\nWould you like to add factions next?',
            },
          },
        },
        result: { success: true, episode: { id: EPISODE_ID, title: 'Pilot' } },
      }),
    ).toBeNull()
  })

  it('returns null for get/list and failed writes', () => {
    expect(
      proposeAssistantEpisodeUpdate({
        toolName: EPISODE_TOOL_ID,
        args: { operation: ManageToolOperation.Get, episodeId: EPISODE_ID },
        result: { success: true, episode: { id: EPISODE_ID, title: 'Pilot' } },
      }),
    ).toBeNull()

    expect(
      proposeAssistantEpisodeUpdate({
        toolName: EPISODE_TOOL_ID,
        args: {
          operation: ManageToolOperation.Update,
          data: { premise: PREMISE },
        },
        result: { success: false, error: 'boom' },
      }),
    ).toBeNull()
  })
})
