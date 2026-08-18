import { describe, expect, it } from 'vitest'
import {
  OpenApiDocInfo,
  OpenApiServerUrl,
} from '@/shared/openapi/constants/openapi-wire'

describe('public OpenAPI copy', () => {
  it('reads as product docs, not an internal generate note', () => {
    expect(OpenApiDocInfo.Title).toBe('nomos.gg API')
    expect(OpenApiDocInfo.Description).toMatch(/Authentication/)
    expect(OpenApiDocInfo.Description).not.toMatch(/npm run/)
    expect(OpenApiDocInfo.Description).not.toMatch(/Zod schemas/)
    expect(OpenApiDocInfo.Description).not.toMatch(/docs\/MCP_API/)
    expect(OpenApiDocInfo.Description).not.toMatch(/<your-api-key>/)
    expect(OpenApiServerUrl.Production).toBe('https://nomos.gg/api')
  })
})
