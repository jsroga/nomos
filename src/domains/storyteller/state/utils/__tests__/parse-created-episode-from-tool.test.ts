import { describe, expect, it } from 'vitest'
import { parseCreatedEpisodeFromToolCall } from '../parse-created-episode-from-tool'
import {
  EPISODE_TOOL_ID,
  ManageToolOperation,
} from '@/domains/storyteller/ai/tools/manage-tools-wire'

describe('parseCreatedEpisodeFromToolCall', () => {
  it('extracts id/title from a successful manage_episode create', () => {
    expect(
      parseCreatedEpisodeFromToolCall({
        toolName: EPISODE_TOOL_ID,
        args: {
          operation: ManageToolOperation.Create,
          projectId: '0696e553-d361-4a36-a839-fb9c5e570e75',
          data: { title: 'Pilot' },
        },
        result: {
          success: true,
          message: 'Created Episode 1: "Pilot"',
          episode: {
            id: '8db804d0-1c39-498e-97a5-dfd7eb828789',
            projectId: '0696e553-d361-4a36-a839-fb9c5e570e75',
            title: 'Pilot',
            sequence: 1,
          },
        },
      })
    ).toEqual({
      episodeId: '8db804d0-1c39-498e-97a5-dfd7eb828789',
      title: 'Pilot',
      sequence: 1,
    })
  })

  it('ignores update/delete and failed creates', () => {
    expect(
      parseCreatedEpisodeFromToolCall({
        toolName: EPISODE_TOOL_ID,
        args: { operation: ManageToolOperation.Update },
        result: {
          success: true,
          episode: { id: '8db804d0-1c39-498e-97a5-dfd7eb828789', title: 'X' },
        },
      })
    ).toBeNull()

    expect(
      parseCreatedEpisodeFromToolCall({
        toolName: EPISODE_TOOL_ID,
        args: { operation: ManageToolOperation.Create },
        result: { success: false, error: 'nope' },
      })
    ).toBeNull()
  })
})
