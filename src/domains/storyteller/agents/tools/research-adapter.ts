import { createTool } from '@mastra/core/tools'
import { getErrorMessage } from '@/shared/errors/error-utils'
import {
  ResearchInputSchema,
  FactCheckInputSchema,
  ReferenceLookupInputSchema,
  ResearchFocusSchema,
} from './schemas'

// Helper Types
type ResearchFocus = typeof ResearchFocusSchema._type

interface ResearchResult {
  title: string
  url: string
  snippet: string
  relevance: number
  source: string
  date?: string
}

// Helper Functions (Ported from legacy)
function buildEnhancedQuery(query: string, focus: ResearchFocus, context?: string): string {
  const focusEnhancements: Record<ResearchFocus, string> = {
    historical: 'historical facts accuracy period authentic',
    cultural: 'cultural traditions practices customs authentic',
    scientific: 'scientific explanation how works accurate',
    psychological: 'psychology behavior motivation cognition',
    mythology: 'mythology folklore legends tradition',
    real_events: 'real events history documentary',
    genre_conventions: 'genre tropes conventions storytelling',
    general: '',
  }

  let enhanced = query
  if (focusEnhancements[focus]) {
    enhanced = `${query} ${focusEnhancements[focus]}`
  }
  if (context) {
    enhanced = `${enhanced} ${context}`
  }
  return enhanced
}

function getDomainsByFocus(focus: ResearchFocus): string[] {
  const domainMap: Record<ResearchFocus, string[]> = {
    historical: [
      'britannica.com',
      'history.com',
      'smithsonianmag.com',
      'jstor.org',
      'en.wikipedia.org',
    ],
    cultural: ['nationalgeographic.com', 'britannica.com', 'en.wikipedia.org', 'bbc.com'],
    scientific: ['scientificamerican.com', 'nature.com', 'sciencedirect.com', 'en.wikipedia.org'],
    psychological: ['psychologytoday.com', 'apa.org', 'ncbi.nlm.nih.gov'],
    mythology: ['britannica.com', 'en.wikipedia.org', 'mythopedia.com'],
    real_events: ['nytimes.com', 'bbc.com', 'reuters.com'],
    genre_conventions: ['tvtropes.org', 'masterclass.com', 'writersdigest.com'],
    general: [],
  }
  return domainMap[focus] || []
}

function extractSourceName(url: string): string {
  try {
    const hostname = new URL(url).hostname
    return hostname.replace('www.', '').split('.')[0]
  } catch {
    return 'unknown'
  }
}

function formatResearchResults(
  results: ResearchResult[],
  query: string,
  focus: ResearchFocus
): string {
  if (results.length === 0) {
    return JSON.stringify({
      success: true,
      query,
      focus,
      message: 'No results found.',
      results: [],
    })
  }
  const formatted = results.map((r, i) => ({
    rank: i + 1,
    title: r.title,
    source: r.source,
    url: r.url,
    excerpt: r.snippet,
    relevance: Math.round(r.relevance * 100) + '%',
  }))
  return JSON.stringify({
    success: true,
    query,
    focus,
    resultCount: results.length,
    results: formatted,
  })
}

// Tool Implementation
export const researchTool = createTool({
  id: 'research_topic',
  description: `Research real-world topics to inform authentic storytelling.
Use this tool to verify historical facts, understand cultural practices, or explore scientific concepts.
Returns relevant sources with snippets.`,
  inputSchema: ResearchInputSchema,
  execute: async (props: any) => {
    const { query, focus, context: storyContext, depth } = props
    try {
      const enhancedQuery = buildEnhancedQuery(query, focus, storyContext)
      const domains = getDomainsByFocus(focus)
      const apiKey = process.env.TAVILY_API_KEY

      if (!apiKey) {
        return JSON.stringify({
          success: false,
          error: 'TAVILY_API_KEY not configured',
          suggestion: 'Please set TAVILY_API_KEY in .env.local',
        })
      }

      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query: enhancedQuery,
          search_depth: depth === 'deep' ? 'advanced' : 'basic',
          include_domains: domains,
          max_results: depth === 'quick' ? 3 : depth === 'deep' ? 8 : 5,
        }),
      })

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.statusText}`)
      }

      const data = await response.json()
      const results: ResearchResult[] = data.results.map((r: any) => ({
        title: r.title,
        url: r.url,
        snippet: r.content?.slice(0, 400) || '',
        relevance: r.score || 0.5,
        source: extractSourceName(r.url),
        date: r.published_date,
      }))

      return formatResearchResults(results, enhancedQuery, focus)
    } catch (error: unknown) {
      console.error('Research tool error:', error)
      return JSON.stringify({
        success: false,
        error: getErrorMessage(error) || 'Unknown error',
        suggestion: 'Try a simplified query.',
      })
    }
  },
})

export const factCheckTool = createTool({
  id: 'fact_check',
  description: 'Quickly verify if a story detail is historically/scientifically accurate.',
  inputSchema: FactCheckInputSchema,
  execute: async (props: any) => {
    const { claim, category } = props
    // For now, we reuse the simplified logic. In Phase 3, this becomes an LLM Judge.
    return JSON.stringify({
      claim,
      category,
      verdict: 'UNVERIFIED',
      note: 'Automatic fact checking is limited. Please use "research_topic" for verified sources.',
      suggestion: `Research "${claim}" with focus="${category}"`,
    })
  },
})

export const referenceLookupTool = createTool({
  id: 'lookup_reference',
  description: 'Quick reference lookup for terms, concepts, or names.',
  inputSchema: ReferenceLookupInputSchema,
  execute: async (props: any) => {
    const { term } = props
    return JSON.stringify({
      term,
      suggestion: `Use research_topic tool to find details about "${term}".`,
    })
  },
})
