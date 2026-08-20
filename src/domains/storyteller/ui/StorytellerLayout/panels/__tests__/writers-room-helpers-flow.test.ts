import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssistantGenerationPhase } from '@/shared/chat/assistant/derive-assistant-generation-activity'
import { AssistantChatBodyKey } from '@/shared/chat/core/constants/assistant-thread-ui'
import { ActionType, BibleSection } from '@/domains/storyteller/core/types/enums'
import { CharacterDraftChatSection, StorytellerChatTool } from '@/domains/storyteller/core/storyteller-page-wire'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import { GenerationActivityPhase } from '@/domains/storyteller/state/constants/storyteller-ui-store'
import { getStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import { UPDATE_WORLD_BIBLE_TOOL_ID } from '@/domains/storyteller/ai/tools/manage-tools-wire'
import { EPISODE_TOOL_ID, ManageToolOperation } from '@/domains/storyteller/ai/tools/manage-tools-wire'
import { recordFromJson } from '@/shared/data/json-guards'
import {
  chatFallbackAddToWorldTargets,
  createBeatCommitActions,
  episodePremiseFromPendings,
  isSuccessfulBeatWrite,
  mapAssistantPhase,
  omitSectionKey,
  previewAlreadyInPlan,
  proposalsFromCompletedToolCall,
  showBeatOnBoard,
  worldDescriptionFromPendings,
  writersRoomChatBody,
  writersRoomProjectContext,
} from '../writers-room-tool-helpers'

const PROJECT_ID = '0696e553-d361-4a36-a839-fb9c5e570e75'
const EPISODE_ID = '8db804d0-1c39-498e-97a5-dfd7eb828789'
const OVERVIEW = 'A salt-marsh city lit by bioluminescent kelp.'
const LOGLINE = 'A body ages overnight.'
const PREMISE = { logline: 'The ledger writes her name first.' }

describe('writersRoomChatBody', () => {
  it('always sends the project id', () => {
    const body = writersRoomChatBody({ projectId: PROJECT_ID })

    expect(body).toEqual({ [AssistantChatBodyKey.ProjectId]: PROJECT_ID })
  })

  it('forwards episode and bible section when the chat is scoped', () => {
    const body = writersRoomChatBody({
      projectId: PROJECT_ID,
      episodeId: EPISODE_ID,
      bibleSection: BibleSection.WORLD_DESCRIPTION,
    })

    expect(body[AssistantChatBodyKey.EpisodeId]).toBe(EPISODE_ID)
    expect(body[AssistantChatBodyKey.BibleSection]).toBe(BibleSection.WORLD_DESCRIPTION)
  })
})

describe('omitSectionKey', () => {
  it('drops only the committed section', () => {
    const next = omitSectionKey(
      {
        [BibleSection.WORLD_DESCRIPTION]: 1,
        [BibleSection.FACTIONS]: 2,
      },
      BibleSection.WORLD_DESCRIPTION,
    )

    expect(next).toEqual({ [BibleSection.FACTIONS]: 2 })
  })
})

describe('previewAlreadyInPlan', () => {
  it('is true when every preview field already matches the plan', () => {
    const already = previewAlreadyInPlan(
      { worldDescription: OVERVIEW },
      { worldDescription: OVERVIEW, factions: [] },
    )

    expect(already).toBe(true)
  })

  it('is false when a preview field differs', () => {
    const already = previewAlreadyInPlan(
      { worldDescription: OVERVIEW },
      { worldDescription: 'A dry plateau.' },
    )

    expect(already).toBe(false)
  })

  it('is false for an empty preview so Add to world can still no-op elsewhere', () => {
    const already = previewAlreadyInPlan({}, { worldDescription: OVERVIEW })

    expect(already).toBe(false)
  })
})

describe('worldDescriptionFromPendings / episodePremiseFromPendings', () => {
  it('reads the first pending Overview', () => {
    const description = worldDescriptionFromPendings({
      [BibleSection.WORLD_DESCRIPTION]: { preview: { worldDescription: OVERVIEW } },
    })

    expect(description).toBe(OVERVIEW)
  })

  it('returns undefined when no pending Overview exists', () => {
    const description = worldDescriptionFromPendings({
      [BibleSection.FACTIONS]: { preview: { factions: [] } },
    })

    expect(description).toBeUndefined()
  })

  it('reads a nested premise object', () => {
    const premise = episodePremiseFromPendings({
      [BibleSection.EPISODE_PREMISE]: { preview: { premise: PREMISE } },
    })

    expect(premise).toEqual(PREMISE)
  })

  it('reads episodePremise when premise is absent', () => {
    const premise = episodePremiseFromPendings({
      [BibleSection.EPISODE_PREMISE]: { preview: { episodePremise: PREMISE } },
    })

    expect(premise).toEqual(PREMISE)
  })
})

describe('createBeatCommitActions', () => {
  it('skips a create that has no logline', () => {
    const actions = createBeatCommitActions([
      { operation: ManageToolOperation.Create, data: { visualHook: 'Fog.' } },
    ])

    expect(actions).toHaveLength(0)
  })

  it('treats a missing operation as create when a logline is present', () => {
    const actions = createBeatCommitActions([{ data: { logline: LOGLINE } }])

    expect(actions).toHaveLength(1)
    expect(actions[0]?.type).toBe(ActionType.CREATE_BEAT)
  })

  it('maps every create arg into its own committed action', () => {
    const actions = createBeatCommitActions([
      { operation: ManageToolOperation.Create, data: { logline: LOGLINE } },
      { operation: ManageToolOperation.Create, data: { logline: PREMISE.logline } },
    ])

    expect(actions).toHaveLength(2)
    expect(recordFromJson(actions[1]?.payload).logline).toBe(PREMISE.logline)
  })

  it('folds actionTaken into setupsPayoffs for the persist payload', () => {
    const actions = createBeatCommitActions([
      {
        operation: ManageToolOperation.Create,
        data: {
          logline: LOGLINE,
          actionTaken: 'She opens the ledger.',
          consequence: 'The year is blank.',
          setupsPayoffs: { planted: 'the year' },
        },
      },
    ])

    expect(recordFromJson(actions[0]?.payload).setupsPayoffs).toEqual({
      planted: 'the year',
      actionTaken: 'She opens the ledger.',
      consequence: 'The year is blank.',
      storyStateChange: undefined,
    })
  })
})

describe('showBeatOnBoard', () => {
  beforeEach(() => {
    getStorytellerUiStore().setPendingBoardHydration(false)
  })

  it('does not switch tabs when no episode is selected', () => {
    const setActiveTab = vi.fn()

    const opened = showBeatOnBoard({
      episodeId: null,
      setActiveTab,
      closeBible: vi.fn(),
      refreshBeats: vi.fn(),
    })

    expect(opened).toBe(false)
    expect(setActiveTab).not.toHaveBeenCalled()
    expect(getStorytellerUiStore().pendingBoardHydration).toBe(false)
  })

  it('holds hydration until beat refresh settles', async () => {
    let finish: (value: unknown) => void = () => undefined
    const refreshBeats = vi.fn(
      () =>
        new Promise(resolve => {
          finish = resolve
        }),
    )

    const opened = showBeatOnBoard({
      episodeId: EPISODE_ID,
      setActiveTab: vi.fn(),
      closeBible: vi.fn(),
      refreshBeats,
    })

    expect(opened).toBe(true)
    expect(getStorytellerUiStore().pendingBoardHydration).toBe(true)
    expect(refreshBeats).toHaveBeenCalledWith(EPISODE_ID)

    finish(undefined)
    await Promise.resolve()
    await Promise.resolve()

    expect(getStorytellerUiStore().pendingBoardHydration).toBe(false)
  })
})

describe('isSuccessfulBeatWrite', () => {
  it('rejects a successful list-shaped manage_beat result', () => {
    const ok = isSuccessfulBeatWrite({
      toolName: StorytellerChatTool.ManageBeat,
      args: {},
      result: { success: true, beats: [{ id: 'b1' }] },
    })

    expect(ok).toBe(false)
  })

  it('rejects a failed write even when a beat object is present', () => {
    const ok = isSuccessfulBeatWrite({
      toolName: StorytellerChatTool.ManageBeat,
      args: {},
      result: { success: false, beat: { id: 'b1', logline: LOGLINE } },
    })

    expect(ok).toBe(false)
  })

  it('rejects a non-beat tool', () => {
    const ok = isSuccessfulBeatWrite({
      toolName: StorytellerChatTool.UpdateWorldBible,
      args: {},
      result: { success: true, beat: { id: 'b1' } },
    })

    expect(ok).toBe(false)
  })
})

describe('chatFallbackAddToWorldTargets', () => {
  it('commits Overview from a tool worldDescription', () => {
    const targets = chatFallbackAddToWorldTargets({
      toolArgs: [{ worldDescription: OVERVIEW }],
      pending: {},
      lastPreview: {},
      chatText: '',
    })

    expect(targets).toHaveLength(1)
    expect(targets?.[0]?.section).toBe(BibleSection.WORLD_DESCRIPTION)
    expect(targets?.[0]?.action.status).toBe(ApprovalActionStatus.COMMITTED)
    expect(targets?.[0]?.preview.worldDescription).toBe(OVERVIEW)
  })

  it('returns an empty list when chat chrome strips to nothing', () => {
    const targets = chatFallbackAddToWorldTargets({
      toolArgs: [],
      pending: {},
      lastPreview: {},
      chatText: 'I\'ll generate a rich episode premise.\n\nWould you like to add factions next?',
    })

    expect(targets).toEqual([])
  })
})

describe('mapAssistantPhase', () => {
  it('mirrors every assistant phase onto the writers-room overlay', () => {
    expect(mapAssistantPhase(AssistantGenerationPhase.Idle)).toBe(GenerationActivityPhase.Idle)
    expect(mapAssistantPhase(AssistantGenerationPhase.Submitted)).toBe(
      GenerationActivityPhase.Submitted,
    )
    expect(mapAssistantPhase(AssistantGenerationPhase.Streaming)).toBe(
      GenerationActivityPhase.Streaming,
    )
    expect(mapAssistantPhase(AssistantGenerationPhase.Tool)).toBe(GenerationActivityPhase.Tool)
    expect(mapAssistantPhase(AssistantGenerationPhase.Error)).toBe(GenerationActivityPhase.Error)
  })
})

describe('proposalsFromCompletedToolCall', () => {
  it('proposes Overview from a successful bible write', () => {
    const proposals = proposalsFromCompletedToolCall({
      toolName: UPDATE_WORLD_BIBLE_TOOL_ID,
      args: { worldDescription: OVERVIEW },
      result: { success: true, updatedFields: ['worldDescription'] },
    })

    expect(proposals.map(item => item.section)).toEqual([BibleSection.WORLD_DESCRIPTION])
  })

  it('does not propose Overview on a character-draft turn', () => {
    const proposals = proposalsFromCompletedToolCall(
      {
        toolName: UPDATE_WORLD_BIBLE_TOOL_ID,
        args: { worldDescription: OVERVIEW },
        result: { success: true, updatedFields: ['worldDescription'] },
      },
      undefined,
      CharacterDraftChatSection.Form,
    )

    expect(proposals).toEqual([])
  })

  it('does not propose bible sections from propose_character_fields', () => {
    const proposals = proposalsFromCompletedToolCall({
      toolName: StorytellerChatTool.ProposeCharacterFields,
      args: { description: OVERVIEW, motivation: 'stay alive' },
      result: { success: true, fields: { description: OVERVIEW } },
    })

    expect(proposals).toEqual([])
  })

  it('proposes episode premise from manage_episode when bible fields are absent', () => {
    const proposals = proposalsFromCompletedToolCall(
      {
        toolName: EPISODE_TOOL_ID,
        args: {
          operation: ManageToolOperation.Update,
          episodeId: EPISODE_ID,
          data: { premise: PREMISE },
        },
        result: { success: true, episode: { id: EPISODE_ID } },
      },
      EPISODE_ID,
    )

    expect(proposals).toHaveLength(1)
    expect(proposals[0]?.section).toBe(BibleSection.EPISODE_PREMISE)
  })
})

describe('writersRoomProjectContext', () => {
  it('lifts plan factions into the chat series bible', () => {
    const context = writersRoomProjectContext({
      projectId: PROJECT_ID,
      characters: [],
      beats: [],
      storyPlan: {
        factions: [{ name: 'Keepers', description: 'They tally.' }],
      },
    })

    expect(context.factions).toEqual([{ name: 'Keepers', description: 'They tally.' }])
    expect(context.projectId).toBe(PROJECT_ID)
  })
})
