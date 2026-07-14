/** SSE stream wiring, error patterns, and transport constants. */

export const DEFAULT_RESUME_URL = '/api/storyteller/workflow/resume'
export const CHAT_MESSAGES_STORAGE_PREFIX = 'chat-messages-'
export const CHAT_DEBUG_ENABLED = '1'
export const SSE_DATA_PREFIX = 'data: '
export const SECTION_FRAME_PREFIX = 'section_'

export enum ChatStreamMode {
  Events = 'events',
}

export enum BrowserWindowEvent {
  BeforeUnload = 'beforeunload',
}

export enum DomExceptionName {
  AbortError = 'AbortError',
}

export enum FetchErrorPattern {
  NetworkError = 'network error',
  Incomplete = 'incomplete',
  Chunked = 'chunked',
}

export enum ChatErrorCode {
  QuotaExceeded = 'QUOTA_EXCEEDED',
  Generic = 'ERROR',
}

export enum ErrorMessagePattern {
  Quota = 'quota',
  RateLimit = 'rate limit',
  Network = 'network',
  Timeout = 'timeout',
  Tool = 'tool',
  MustBe = 'must be',
}

export const STREAM_JSON_MESSAGE_REGEX = /"message"\s*:\s*"((?:[^"\\]|\\.)*)"?/
export const STREAM_JSON_ESCAPE_QUOTE = /\\"/g
export const STREAM_JSON_ESCAPE_NEWLINE = /\\n/g
