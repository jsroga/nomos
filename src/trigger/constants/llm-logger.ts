import { OpenAiChatRole } from '@/shared/data/constants/protocol'

export enum LlmLogEntryType {
  Request = 'llm_request',
  RequestStart = 'llm_request_start',
  RequestComplete = 'llm_request_complete',
  RequestError = 'llm_request_error',
}

export enum LlmLogMessage {
  Request = '[LLM Request]',
  RequestStart = '[LLM Request Start]',
  RequestComplete = '[LLM Request Complete]',
  RequestError = '[LLM Request Error]',
}

export enum LlmLogFallback {
  UnknownModel = 'unknown',
  UnknownError = 'Unknown error',
}

export enum LlmLogSanitize {
  Base64ImageTruncated = '[Base64 Image Data - truncated]',
  Base64Image = '[Base64 Image Data]',
  TruncatedSuffix = '... [truncated]',
  Redacted = '[REDACTED]',
}

export enum LlmLogSensitiveKeyFragment {
  Key = 'key',
  Secret = 'secret',
  Token = 'token',
}

export enum LlmContentPartType {
  Text = 'text',
}

export enum LlmResponseField {
  B64Json = 'b64_json',
  InlineData = 'inline_data',
  InlineDataCamel = 'inlineData',
}

export const LLM_LOG_USER_ROLE = OpenAiChatRole.User
