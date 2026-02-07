/**
 * Query Expansion Module
 *
 * Expands vague queries into multiple specific sub-queries to improve
 * RAG retrieval coverage and relevance.
 *
 * Strategies:
 * - Decomposition: Break complex queries into simpler parts
 * - Synonym expansion: Add related terms
 * - Hypothetical: Generate hypothetical answers that might match documents
 */

import { ChatOpenAI } from '@langchain/openai'

// ============================================
// TYPES
// ============================================

export type ExpansionStrategy = 'synonym' | 'decomposition' | 'hypothetical' | 'all'

export interface QueryExpansion {
  original: string
  expanded: string[]
  strategy: ExpansionStrategy
  metadata?: {
    synonyms?: string[]
    subQueries?: string[]
    hypotheticalAnswers?: string[]
  }
}

export interface QueryExpanderConfig {
  maxExpansions: number // Max total expanded queries
  enableSynonyms: boolean
  enableDecomposition: boolean
  enableHypothetical: boolean
  minQueryLength: number // Skip expansion for very short queries
  useLLM: boolean // Use LLM for intelligent expansion
}

const DEFAULT_CONFIG: QueryExpanderConfig = {
  maxExpansions: 5,
  enableSynonyms: true,
  enableDecomposition: true,
  enableHypothetical: true,
  minQueryLength: 10,
  useLLM: true,
}

// ============================================
// DOMAIN-SPECIFIC SYNONYMS
// ============================================

const STORYTELLING_SYNONYMS: Record<string, string[]> = {
  // Characters
  character: ['protagonist', 'antagonist', 'hero', 'villain', 'persona', 'figure'],
  'main character': ['protagonist', 'lead', 'hero', 'central character'],
  villain: ['antagonist', 'enemy', 'adversary', 'bad guy'],

  // Story structure
  plot: ['storyline', 'narrative', 'story arc', 'plot line'],
  story: ['narrative', 'tale', 'plot', 'saga'],
  scene: ['sequence', 'moment', 'segment', 'beat'],
  episode: ['chapter', 'installment', 'part', 'segment'],
  arc: ['storyline', 'journey', 'progression', 'development'],
  beat: ['moment', 'scene', 'point', 'event'],

  // Character attributes
  personality: ['traits', 'characteristics', 'nature', 'temperament'],
  motivation: ['goals', 'desires', 'drives', 'ambitions', 'objectives'],
  backstory: ['background', 'history', 'past', 'origin'],
  relationships: ['connections', 'dynamics', 'bonds', 'interactions'],

  // Story elements
  conflict: ['tension', 'struggle', 'clash', 'confrontation'],
  theme: ['message', 'motif', 'idea', 'subject'],
  setting: ['location', 'world', 'environment', 'backdrop'],
  dialogue: ['conversation', 'speech', 'lines', 'exchanges'],

  // Writing
  describe: ['explain', 'detail', 'outline', 'elaborate on'],
  create: ['write', 'develop', 'craft', 'generate'],
  change: ['modify', 'alter', 'update', 'revise'],
}

// ============================================
// HEURISTIC EXPANDER
// ============================================

/**
 * Fast heuristic-based query expansion
 * No LLM calls - uses pattern matching and synonym dictionaries
 */
export function expandQueryHeuristic(
  query: string,
  config: Partial<QueryExpanderConfig> = {}
): QueryExpansion {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }

  // Guard against null/undefined query
  if (!query) {
    return { original: '', expanded: [], strategy: 'synonym', metadata: {} }
  }

  const expanded: string[] = [query] // Always include original
  const metadata: QueryExpansion['metadata'] = {}

  // Skip very short queries
  if (query.length < fullConfig.minQueryLength) {
    return { original: query, expanded, strategy: 'synonym' }
  }

  const queryLower = query.toLowerCase()

  // 1. Synonym expansion
  if (fullConfig.enableSynonyms) {
    const synonymExpansions: string[] = []

    for (const [term, synonyms] of Object.entries(STORYTELLING_SYNONYMS)) {
      if (queryLower.includes(term)) {
        // Add variations with synonyms
        for (const syn of synonyms.slice(0, 2)) {
          // Limit synonyms per term
          const variation = query.replace(new RegExp(term, 'gi'), syn)
          if (variation !== query && !expanded.includes(variation)) {
            synonymExpansions.push(variation)
          }
        }
      }
    }

    metadata.synonyms = synonymExpansions
    expanded.push(...synonymExpansions.slice(0, 2))
  }

  // 2. Question decomposition
  if (fullConfig.enableDecomposition) {
    const subQueries = decomposeQuery(query)
    metadata.subQueries = subQueries
    expanded.push(...subQueries.slice(0, 2))
  }

  // 3. Hypothetical document expansion (simple version)
  if (fullConfig.enableHypothetical) {
    const hypothetical = generateHypotheticalHeuristic(query)
    if (hypothetical) {
      metadata.hypotheticalAnswers = [hypothetical]
      expanded.push(hypothetical)
    }
  }

  // Dedupe and limit
  const uniqueExpanded = [...new Set(expanded)].slice(0, fullConfig.maxExpansions)

  return {
    original: query,
    expanded: uniqueExpanded,
    strategy: 'all',
    metadata,
  }
}

/**
 * Decompose a complex query into simpler sub-queries
 */
function decomposeQuery(query: string): string[] {
  const subQueries: string[] = []

  // Pattern: "about X and Y" -> separate queries
  const andMatch = query.match(/(?:about|regarding|for)\s+(.+?)\s+and\s+(.+?)(?:\?|$)/i)
  if (andMatch) {
    subQueries.push(`about ${andMatch[1]}`)
    subQueries.push(`about ${andMatch[2]}`)
  }

  // Pattern: "X's Y" -> separate entity and attribute
  const possessiveMatch = query.match(/(\w+)'s\s+(\w+)/i)
  if (possessiveMatch) {
    subQueries.push(`${possessiveMatch[1]}`)
    subQueries.push(`${possessiveMatch[1]} ${possessiveMatch[2]}`)
  }

  // Pattern: "how does X relate to Y" -> two queries
  const relateMatch = query.match(
    /how\s+(?:does|do)\s+(.+?)\s+(?:relate|connect|interact)\s+(?:to|with)\s+(.+)/i
  )
  if (relateMatch) {
    subQueries.push(`${relateMatch[1]}`)
    subQueries.push(`${relateMatch[2]}`)
    subQueries.push(`${relateMatch[1]} ${relateMatch[2]} relationship`)
  }

  // Pattern: "what is X" or "who is X" -> just the entity
  const whatIsMatch = query.match(/(?:what|who)\s+is\s+(.+?)(?:\?|$)/i)
  if (whatIsMatch) {
    subQueries.push(whatIsMatch[1].trim())
  }

  // Pattern: "tell me about X" -> just X
  const tellMeMatch = query.match(/tell\s+me\s+(?:about|regarding)\s+(.+?)(?:\?|$)/i)
  if (tellMeMatch) {
    const entity = tellMeMatch[1].trim()
    subQueries.push(entity)
    subQueries.push(`${entity} background`)
    subQueries.push(`${entity} characteristics`)
  }

  return subQueries
}

/**
 * Generate a hypothetical answer that might match documents
 */
function generateHypotheticalHeuristic(query: string): string | null {
  const queryLower = query.toLowerCase()

  // Character queries
  if (queryLower.includes('character') || /who\s+is/i.test(query)) {
    const characterMatch = query.match(/(?:character|who\s+is)\s+(\w+)/i)
    if (characterMatch) {
      return `${characterMatch[1]} is a character who`
    }
  }

  // Plot queries
  if (queryLower.includes('plot') || queryLower.includes('story')) {
    return 'The story follows'
  }

  // Relationship queries
  if (queryLower.includes('relationship') || queryLower.includes('between')) {
    return 'The relationship between them involves'
  }

  // Setting queries
  if (
    queryLower.includes('setting') ||
    queryLower.includes('world') ||
    queryLower.includes('where')
  ) {
    return 'The story takes place in'
  }

  return null
}

// ============================================
// LLM-POWERED EXPANDER
// ============================================

const EXPANSION_PROMPT = `You are a query expansion expert for a storytelling/screenwriting system.

Given a user query, generate expanded queries to improve document retrieval.

## Original Query
{query}

## Tasks
1. **Decomposition**: If the query asks about multiple things, split into specific sub-queries
2. **Synonyms**: Replace key terms with domain-specific synonyms (character/protagonist, plot/storyline, etc.)
3. **Hypothetical**: Generate a short sentence that might appear in a matching document

## Rules
- Keep expanded queries concise (under 15 words each)
- Focus on storytelling domain (characters, plot, dialogue, scenes, arcs)
- Generate 3-5 expansions total
- Don't repeat the original query

Respond with JSON only:
{
  "subQueries": ["decomposed query 1", "decomposed query 2"],
  "synonymExpansions": ["query with synonym 1"],
  "hypotheticalDocuments": ["A short sentence that might match relevant documents"]
}`

/**
 * LLM-powered intelligent query expansion
 */
export async function expandQueryLLM(
  query: string,
  config: Partial<QueryExpanderConfig> = {}
): Promise<QueryExpansion> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }

  // Skip expansion for very short queries
  if (query.length < fullConfig.minQueryLength) {
    return { original: query, expanded: [query], strategy: 'synonym' }
  }

  try {
    const model = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0,
    })

    const prompt = EXPANSION_PROMPT.replace('{query}', query)
    const response = await model.invoke(prompt)
    const responseText =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON in response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    const expanded: string[] = [query] // Always include original
    const metadata: QueryExpansion['metadata'] = {}

    if (parsed.subQueries && Array.isArray(parsed.subQueries)) {
      metadata.subQueries = parsed.subQueries
      expanded.push(...parsed.subQueries)
    }

    if (parsed.synonymExpansions && Array.isArray(parsed.synonymExpansions)) {
      metadata.synonyms = parsed.synonymExpansions
      expanded.push(...parsed.synonymExpansions)
    }

    if (parsed.hypotheticalDocuments && Array.isArray(parsed.hypotheticalDocuments)) {
      metadata.hypotheticalAnswers = parsed.hypotheticalDocuments
      expanded.push(...parsed.hypotheticalDocuments)
    }

    // Dedupe and limit
    const uniqueExpanded = [...new Set(expanded)].slice(0, fullConfig.maxExpansions)

    return {
      original: query,
      expanded: uniqueExpanded,
      strategy: 'all',
      metadata,
    }
  } catch (error) {
    console.warn('LLM query expansion failed, falling back to heuristic:', error)
    return expandQueryHeuristic(query, config)
  }
}

// ============================================
// MAIN EXPANDER CLASS
// ============================================

export class QueryExpander {
  private config: QueryExpanderConfig

  constructor(config: Partial<QueryExpanderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Expand a query using configured strategy
   */
  async expand(query: string): Promise<QueryExpansion> {
    if (this.config.useLLM) {
      return expandQueryLLM(query, this.config)
    }
    return expandQueryHeuristic(query, this.config)
  }

  /**
   * Expand multiple queries
   */
  async expandAll(queries: string[]): Promise<QueryExpansion[]> {
    return Promise.all(queries.map(q => this.expand(q)))
  }

  /**
   * Get all expanded queries as a flat array
   */
  async getExpandedQueries(query: string): Promise<string[]> {
    const expansion = await this.expand(query)
    return expansion.expanded
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let queryExpanderInstance: QueryExpander | null = null

export function getQueryExpander(config?: Partial<QueryExpanderConfig>): QueryExpander {
  if (!queryExpanderInstance || config) {
    queryExpanderInstance = new QueryExpander(config)
  }
  return queryExpanderInstance
}
