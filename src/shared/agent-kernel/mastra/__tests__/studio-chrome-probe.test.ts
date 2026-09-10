import { describe, expect, it } from 'vitest'
import { HttpMethod, HttpStatus } from '@/shared/data/constants/protocol'
import {
  EMPTY_LOGS_PAGE,
  MEMORY_STATUS_DISABLED,
  StudioChromeQueryParam,
} from '../constants/studio-chrome'
import { matchStudioChromeProbe } from '../studio-chrome-probe'

function params(query: string): URLSearchParams {
  return new URLSearchParams(query)
}

describe('matchStudioChromeProbe', () => {
  it('returns an empty log list for GET /api/logs without transportId', () => {
    const hit = matchStudioChromeProbe({
      method: HttpMethod.Get,
      pathname: '/api/logs',
      searchParams: params(''),
    })
    expect(hit?.status).toBe(HttpStatus.OK)
    expect(hit?.body).toEqual(EMPTY_LOGS_PAGE)
  })

  it('does not swallow GET /api/logs/transports', () => {
    const hit = matchStudioChromeProbe({
      method: HttpMethod.Get,
      pathname: '/api/logs/transports',
      searchParams: params(''),
    })
    expect(hit).toBeNull()
  })

  it('leaves GET /api/logs with transportId to Mastra Zod', () => {
    const hit = matchStudioChromeProbe({
      method: HttpMethod.Get,
      pathname: '/api/logs',
      searchParams: params(`${StudioChromeQueryParam.TransportId}=pino`),
    })
    expect(hit).toBeNull()
  })

  it('returns disabled memory status for GET /api/memory/status without agentId', () => {
    const hit = matchStudioChromeProbe({
      method: HttpMethod.Get,
      pathname: '/api/memory/status',
      searchParams: params(''),
    })
    expect(hit?.status).toBe(HttpStatus.OK)
    expect(hit?.body).toEqual(MEMORY_STATUS_DISABLED)
  })

  it('leaves GET /api/memory/status with agentId to Mastra Zod', () => {
    const hit = matchStudioChromeProbe({
      method: HttpMethod.Get,
      pathname: '/api/memory/status',
      searchParams: params(`${StudioChromeQueryParam.AgentId}=storyteller`),
    })
    expect(hit).toBeNull()
  })
})
