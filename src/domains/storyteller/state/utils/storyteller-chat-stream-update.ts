import { parsePhaseId, type PhaseId } from '@/domains/storyteller/core/types/enums'
import { storytellerCharacterFromRow } from '@/domains/storyteller/core/entities/character-wire'
import type { StorytellerCharacter } from '@/domains/storyteller/core/entities/character-wire'
import { fetchStorytellerCharacters } from '@/domains/storyteller/core/io/character.api'
import { clearFetchCache } from '@/shared/data/fetch-cache'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import {
  AsyncOperationStatus,
  ChatFrameType,
  StorytellerChatLog,
  StorytellerChatTool,
  StorytellerGlobalOperation,
} from '@/domains/storyteller/state/constants/storyteller-chat'

type StreamingUpdateData = Record<string, unknown>

interface StorytellerStreamingUpdateContext {
  currentProjectId: string | undefined
  setCharacters: React.Dispatch<React.SetStateAction<StorytellerCharacter[]>>
  setCurrentPhase: (phase: PhaseId) => void
}

function handleStreamStart(): void {
  useGlobalStatusStore.getState().addOperation({
    id: StorytellerGlobalOperation.StorySession,
    type: StorytellerGlobalOperation.StoryAgent,
    label: StorytellerGlobalOperation.StorySession,
    details: StorytellerGlobalOperation.WritersRoom,
    status: AsyncOperationStatus.InProgress,
  })
}

function handleStreamNodeUpdate(data: StreamingUpdateData): void {
  const nodeDetail = readString(recordFromJson(data).node)
  useGlobalStatusStore.getState().updateOperation(StorytellerGlobalOperation.StorySession, {
    details: nodeDetail ?? undefined,
  })
}

function handleStreamComplete(): void {
  useGlobalStatusStore.getState().removeOperation(StorytellerGlobalOperation.StorySession)
}

function isNodeProgressFrame(data: StreamingUpdateData): boolean {
  if (data.type === ChatFrameType.NodeStart) return true
  return data.type === ChatFrameType.Message && ChatFrameType.Node in data && Boolean(data.node)
}

function isTerminalFrame(type: unknown): boolean {
  return (
    type === ChatFrameType.Done ||
    type === ChatFrameType.Terminated ||
    type === ChatFrameType.Error ||
    type === ChatFrameType.Complete
  )
}

function handleCreateCharacterResult(
  ctx: StorytellerStreamingUpdateContext,
  data: StreamingUpdateData
): void {
  console.log(StorytellerChatLog.CharacterCreatedSync)
  if (!ctx.currentProjectId) return

  clearFetchCache(`characters:${ctx.currentProjectId}`)
  const resultRecord = recordFromJson(data.result)
  const newChar = storytellerCharacterFromRow(resultRecord.character)
  if (newChar) {
    ctx.setCharacters(prev => {
      const filtered = prev.filter(
        c => c.id !== newChar.id && c.name.toLowerCase() !== newChar.name.toLowerCase()
      )
      return [newChar, ...filtered]
    })
    return
  }

  fetchStorytellerCharacters(ctx.currentProjectId)
    .then(charData => {
      if (!Array.isArray(charData)) return
      const mapped = charData
        .map(row => storytellerCharacterFromRow(row))
        .filter((character): character is StorytellerCharacter => character !== null)
      ctx.setCharacters(mapped)
    })
    .catch(e => console.error(StorytellerChatLog.RefetchCharactersFailed, e))
}

function handleUpdateStoryPhaseResult(
  ctx: StorytellerStreamingUpdateContext,
  data: StreamingUpdateData
): void {
  const phase = readString(recordFromJson(data.result).phase)
  if (!phase) return
  console.log(StorytellerChatLog.PhaseUpdated, phase)
  ctx.setCurrentPhase(parsePhaseId(phase))
}

function handleToolResultFrame(
  ctx: StorytellerStreamingUpdateContext,
  data: StreamingUpdateData
): void {
  const toolName = data.toolName
  if (toolName === StorytellerChatTool.CreateCharacter) {
    handleCreateCharacterResult(ctx, data)
    return
  }
  if (toolName === StorytellerChatTool.UpdateWorldBible) {
    console.log(StorytellerChatLog.WorldBibleUpdated)
    return
  }
  if (toolName === StorytellerChatTool.UpdateStoryPhase) {
    handleUpdateStoryPhaseResult(ctx, data)
  }
}

export function handleStorytellerStreamingUpdate(
  ctx: StorytellerStreamingUpdateContext,
  data: StreamingUpdateData
): void {
  console.log(StorytellerChatLog.StreamingUpdate, data.type)

  if (data.type === ChatFrameType.Start) {
    handleStreamStart()
    return
  }
  if (isNodeProgressFrame(data)) {
    handleStreamNodeUpdate(data)
    return
  }
  if (isTerminalFrame(data.type)) {
    handleStreamComplete()
    return
  }
  if (data.type === ChatFrameType.ToolResult) {
    handleToolResultFrame(ctx, data)
  }
}
