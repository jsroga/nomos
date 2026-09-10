/** Exact Studio leftover probes that trip `@mastra/server` query Zod. */

export enum StudioChromePath {
  ApiLogs = '/api/logs',
  Logs = '/logs',
  ApiMemoryStatus = '/api/memory/status',
  MemoryStatus = '/memory/status',
}

export enum StudioChromeQueryParam {
  TransportId = 'transportId',
  AgentId = 'agentId',
}

export const EMPTY_LOGS_PAGE = {
  logs: [],
  total: 0,
  page: 0,
  perPage: 100,
  hasMore: false,
} as const

export const MEMORY_STATUS_DISABLED = {
  result: false,
} as const
