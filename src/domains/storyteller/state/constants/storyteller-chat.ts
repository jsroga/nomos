import {
  StorytellerChatTool,
  StorytellerGlobalOperation,
  StorytellerMessageRole,
  StorytellerMessageType,
  StorytellerStreamMode,
  StorytellerTab,
  StorytellerThreadId,
} from '@/domains/storyteller/core/storyteller-page-wire'
import { Phase } from '@/domains/storyteller/core/types/Enums'
import { ChatSenderName } from '@/domains/storyteller/io/constants/chat-route'
import { ChatFrameType } from '@/shared/chat/core/protocol'
import { ChatMessageRole } from '@/shared/chat/core/constants/chat-messages'
import { OpenAiChatRole } from '@/shared/data/constants/protocol'
import { AsyncOperationStatus } from '@/shared/jobs/constants/async-operation-status'

export const STORYTELLER_CHAT_WELCOME_MESSAGE =
  'Welcome to the Writers Room! Select an episode to begin, then tell me about the story you want to create.'

export enum StorytellerChatLog {
  ActionReceived = '[Action received]',
  ActionCommitted = '[Action committed]',
  ActionFailed = '[Action failed]',
  ActionMapped = '[Action] Mapped',
  ActionPendingOverlay = '[Action] Pending overlay for',
  SectionAccept = '[Section Accept]',
  SectionReject = '[Section Reject]',
  SectionAcceptFailed = '[Section Accept] Failed:',
  NoPayload = 'no payload',
  BlockedSend = '[Storyteller] Blocked send - already processing a message',
  StreamingUpdate = '📡 [DEBUG] Streaming update:',
  CharacterCreatedSync = '🔄 [Storyteller] Character created by agent, syncing sidebar...',
  WorldBibleUpdated = '🔄 [Storyteller] World Bible updated by agent tool',
  PhaseUpdated = '🎬 [Storyteller] Story phase updated to:',
  RefetchCharactersFailed = 'Failed to refetch characters',
  Generating = 'Generating...',
}

export {
  StorytellerChatTool,
  StorytellerGlobalOperation,
  StorytellerMessageRole,
  StorytellerMessageType,
  StorytellerStreamMode,
  StorytellerTab,
  StorytellerThreadId,
  Phase,
  ChatSenderName,
  ChatFrameType,
  ChatMessageRole,
  OpenAiChatRole,
  AsyncOperationStatus,
}
