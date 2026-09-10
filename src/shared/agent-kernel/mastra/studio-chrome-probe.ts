import { HttpMethod, HttpStatus } from '@/shared/data/constants/protocol'
import {
  EMPTY_LOGS_PAGE,
  MEMORY_STATUS_DISABLED,
  StudioChromePath,
  StudioChromeQueryParam,
} from './constants/studio-chrome'

export interface StudioChromeProbeRequest {
  method: string
  pathname: string
  searchParams: URLSearchParams
}

export interface StudioChromeProbeHit {
  status: HttpStatus.OK
  body: typeof EMPTY_LOGS_PAGE | typeof MEMORY_STATUS_DISABLED
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }
  return pathname
}

function isGet(method: string): boolean {
  return method.toUpperCase() === HttpMethod.Get
}

/**
 * Exact leftover Studio probes — never prefix-match `/api/logs/*`
 * (that would swallow `/api/logs/transports`).
 */
export function matchStudioChromeProbe(
  request: StudioChromeProbeRequest,
): StudioChromeProbeHit | null {
  if (!isGet(request.method)) return null
  const pathname = normalizePathname(request.pathname)
  const transportId = request.searchParams.get(StudioChromeQueryParam.TransportId)
  const agentId = request.searchParams.get(StudioChromeQueryParam.AgentId)

  if (
    (pathname === StudioChromePath.ApiLogs || pathname === StudioChromePath.Logs) &&
    !transportId
  ) {
    return { status: HttpStatus.OK, body: EMPTY_LOGS_PAGE }
  }

  if (
    (pathname === StudioChromePath.ApiMemoryStatus ||
      pathname === StudioChromePath.MemoryStatus) &&
    !agentId
  ) {
    return { status: HttpStatus.OK, body: MEMORY_STATUS_DISABLED }
  }

  return null
}
