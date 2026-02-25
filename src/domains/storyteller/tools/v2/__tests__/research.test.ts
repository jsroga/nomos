import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { researchTool } from '../research-adapter'

// Mock global fetch
const fetchMock = vi.fn()
global.fetch = fetchMock

describe('Research Tools (v2)', () => {
  beforeEach(() => {
    process.env.TAVILY_API_KEY = 'test-key'
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should return error if API key missing', async () => {
    delete process.env.TAVILY_API_KEY
    const result = await researchTool.execute({
      query: 'test', focus: 'general'
    })
    const parsed = JSON.parse(result as string)
    expect(parsed.success).toBe(false)
    expect(parsed.error).toContain('TAVILY_API_KEY')
  })

  it('should call Tavily API with enhanced query', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ title: 'Test Result', url: 'http://test.com', content: 'Snippet', score: 0.9 }],
      }),
    })

    const result = await researchTool.execute({
      query: 'Napoleon', focus: 'historical'
    })

    const parsed = JSON.parse(result as string)
    expect(parsed.success).toBe(true)
    expect(parsed.results[0].title).toBe('Test Result')

    // Verify focus enhancement
    const callArgs = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(callArgs.query).toContain('historical facts')
  })

  it('should handle API failure gracefully', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
    })

    const result = await researchTool.execute({
      query: 'Napoleon', focus: 'historical'
    })

    const parsed = JSON.parse(result as string)
    expect(parsed.success).toBe(false)
    expect(parsed.error).toContain('Tavily API error')
  })
})
