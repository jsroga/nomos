/** Chat message roles, senders, and user-facing copy. */

export enum ChatMessageRole {
  Human = 'human',
  Ai = 'ai',
  System = 'system',
  ConsistencyCheck = 'consistency_check',
}

export enum ChatMessageSender {
  System = 'System',
  Storyteller = 'Storyteller',
  Agent = 'Agent',
  Unknown = 'Unknown',
  Processing = 'Processing',
}

export enum ChatSenderAlias {
  User = 'user',
  Showrunner = 'showrunner',
  Supervisor = 'supervisor',
  RunnableSequence = 'RunnableSequence',
}

export enum QuestionSessionStatus {
  Pending = 'pending',
  Answered = 'answered',
  Skipped = 'skipped',
}

export enum QuestionUrgency {
  Blocking = 'blocking',
  Normal = 'normal',
}

export enum ActivityLogEntryType {
  Status = 'status',
  Thinking = 'thinking',
  Tool = 'tool',
  Action = 'action',
  Error = 'error',
  Start = 'start',
  Complete = 'complete',
}

export const CHAT_STREAM_STOPPED_MESSAGE = '⏹️ Stream stopped by user.'
export const CHAT_PROPOSED_ACTION_LABEL = 'Proposed Action'
export const CHAT_BEFORE_UNLOAD_WARNING = 'Agent is still working. Leave anyway?'
export const CHAT_INTERRUPTED_TASK_LABEL = 'In progress'
export const CHAT_INTERRUPTED_PROCESSING_TASK = 'Processing request...'
export const CHAT_AGENT_PROCESSING_STATUS = 'Processing...'
export const CHAT_SESSION_CORRUPTED_MESSAGE =
  '⚠️ Session state was corrupted. Please refresh the page and try again.'
export const CHAT_ERROR_DISPLAY_PREFIX = '❌ **Error:**'
export const CHAT_QUOTA_EXCEEDED_MESSAGE =
  '⚠️ **API Quota Exceeded**\n\nThe AI service has reached its usage limit. Please:\n- Check your OpenAI billing settings\n- Wait a few minutes and try again\n- Contact support if the issue persists'
export const CHAT_RATE_LIMITED_MESSAGE =
  '⏳ **Rate Limited**\n\nToo many requests. Please wait a moment and try again.'
export const CHAT_CONNECTION_ERROR_MESSAGE =
  '🌐 **Connection Error**\n\nCouldn\'t reach the AI service. Please check your internet connection and try again.'
export const CHAT_HOT_RELOAD_ERROR_MESSAGE =
  'Connection interrupted (possibly due to Hot Reload). Please try again.'
export const CHAT_SEND_MESSAGE_FAILED = 'Failed to send message. Please try again.'
export const CHAT_THINKING_ENTRY_SEPARATOR = '\n\n---\n\n'
export const CHAT_UNKNOWN_ERROR = 'Unknown error'
