/** Market analysis defaults, stream wire, and UI copy. */

import { SseHeader } from '@/shared/data/constants/protocol'

export enum LoopGameGenreDefault {
  Indie = 'indie',
}

export enum LoopGamePlatformDefault {
  Pc = 'pc',
}

export enum LoopGameAudienceDefault {
  Core = 'core',
}

export enum MarketTrendDirection {
  Rising = 'rising',
  Stable = 'stable',
  Declining = 'declining',
}

export enum MarketAnalysisStreamDoneEvent {
  Done = 'done',
}

export enum MarketAnalysisStreamEvent {
  Error = 'error',
  Progress = 'progress',
  ToolCall = 'tool_call',
  ToolResult = 'tool_result',
  Message = 'message',
  Report = 'report',
}

export const MARKET_ANALYSIS_SSE_HEADERS = {
  CONTENT_TYPE: SseHeader.ContentType,
  CACHE_CONTROL: SseHeader.CacheControl,
  CONNECTION: SseHeader.Connection,
} as const

export const MARKET_ANALYSIS_SSE_DATA_PREFIX = 'data: '

export enum MarketAnalysisErrorMessage {
  NoResponseBody = 'No response body',
  AnalysisError = 'Analysis error',
  FailedToSave = 'Failed to save',
}

export enum MarketViabilityScoreEmoji {
  High = '🟢',
  Medium = '🟡',
  Low = '🟠',
  Critical = '🔴',
}

export const MARKET_ANALYSIS_COMPLETE_REASONING =
  'Market analysis completed successfully'

export const MARKET_ANALYSIS_NO_STRUCTURED_REPORT =
  'Analysis completed but no structured report was generated.'
