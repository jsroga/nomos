import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { requestContext, getCurrentContext } from '@/mcp/core/request-context'
import type { MCPServiceContext } from '@/mcp/core/types'

// Mock the auth module
vi.mock('@/mcp/core/auth', () => ({
  validateApiKey: vi.fn(),
  getServiceContext: vi.fn(),
}))

import { validateApiKey, getServiceContext } from '@/mcp/core/auth'

describe('Request Context (AsyncLocalStorage)', () => {
  const mockContext: MCPServiceContext = {
    userId: 'test-user-id',
    supabase: {} as any,
    apiKeyId: 'key-id',
    apiKeyName: 'Test Key',
    scopes: ['*'],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Clear any cached env vars by restoring originals if needed
    delete process.env.MCP_API_KEY
  })

  afterEach(() => {
    delete process.env.MCP_API_KEY
  })

  describe('requestContext.run()', () => {
    it('should provide context within the run callback', async () => {
      let receivedContext: MCPServiceContext | undefined

      await requestContext.run(mockContext, async () => {
        receivedContext = requestContext.getStore()
      })

      expect(receivedContext).toEqual(mockContext)
    })

    it('should isolate context between concurrent runs', async () => {
      const context1: MCPServiceContext = { ...mockContext, userId: 'user-1' }
      const context2: MCPServiceContext = { ...mockContext, userId: 'user-2' }

      const results: string[] = []

      await Promise.all([
        requestContext.run(context1, async () => {
          await new Promise(r => setTimeout(r, 10)) // Simulate async work
          results.push(requestContext.getStore()!.userId)
        }),
        requestContext.run(context2, async () => {
          results.push(requestContext.getStore()!.userId)
        }),
      ])

      expect(results).toContain('user-1')
      expect(results).toContain('user-2')
    })

    it('should return undefined outside of run()', () => {
      expect(requestContext.getStore()).toBeUndefined()
    })
  })

  describe('getCurrentContext()', () => {
    it('should return context from AsyncLocalStorage if available', async () => {
      let result: MCPServiceContext | undefined

      await requestContext.run(mockContext, async () => {
        result = await getCurrentContext()
      })

      expect(result).toEqual(mockContext)
    })

    it('should fallback to env var when outside of ALS', async () => {
      process.env.MCP_API_KEY = 'test-env-key'

      const mockAuthResult = { valid: true, userId: 'env-user' }
      const mockEnvContext: MCPServiceContext = {
        ...mockContext,
        userId: 'env-user',
      }

      vi.mocked(validateApiKey).mockResolvedValue(mockAuthResult as any)
      vi.mocked(getServiceContext).mockResolvedValue(mockEnvContext)

      const result = await getCurrentContext()

      expect(validateApiKey).toHaveBeenCalledWith('test-env-key')
      expect(getServiceContext).toHaveBeenCalledWith(mockAuthResult)
      expect(result.userId).toBe('env-user')
    })

    it('should throw if no ALS context and no env var', async () => {
      // No MCP_API_KEY set
      await expect(getCurrentContext()).rejects.toThrow(
        'Authentication required: No Context or MCP_API_KEY found.'
      )
    })

    it('should throw if env var key is invalid', async () => {
      process.env.MCP_API_KEY = 'invalid-key'

      vi.mocked(validateApiKey).mockResolvedValue({ valid: false, error: 'Invalid' })

      await expect(getCurrentContext()).rejects.toThrow(
        'Authentication failed: Invalid MCP_API_KEY in environment.'
      )
    })
  })
})
