/**
 * RAG Tools v2 - Mastra Implementation
 *
 * Production-grade RAG tools using hybrid search (vector + keyword).
 * Provides citation-aware retrieval for grounded generation.
 *
 * Migrated from legacy LangChain DynamicStructuredTool.
 */

import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { ragService, DocumentType, RagResult } from '../../services/rag-service'

// ==========================================
// SCHEMAS
// ==========================================

const DocumentTypeSchema = z.enum([
  'world_rule',
  'character_arc',
  'beat_decision',
  'episode_summary',
  'user_feedback',
  'agent_reasoning',
])

const SearchKnowledgeBaseInputSchema = z.object({
  query: z.string().describe('Natural language search query describing what you want to find'),
  projectId: z.string().describe('Project ID to search within'),
  documentTypes: z
    .array(DocumentTypeSchema)
    .optional()
    .describe('Filter by specific document types (optional)'),
  seriesBible: z.record(z.unknown()).optional().describe('In-memory series bible for fallback search'),
  characters: z
    .array(z.record(z.unknown()))
    .optional()
    .describe('Current character states for fallback search'),
  limit: z.number().optional().default(5).describe('Maximum results to return'),
})

const StoreKnowledgeInputSchema = z.object({
  content: z.string().describe('The information to store'),
  projectId: z.string().describe('Project ID to store within'),
  documentType: DocumentTypeSchema.describe('Type of document'),
  metadata: z
    .object({
      episodeId: z.string().optional(),
      characterId: z.string().optional(),
      beatId: z.string().optional(),
      agentName: z.string().optional(),
    })
    .optional()
    .describe('Additional metadata'),
})

const CharacterHistoryInputSchema = z.object({
  characterName: z.string().describe('Name of the character to search'),
  projectId: z.string().describe('Project ID to search within'),
  limit: z.number().optional().default(5).describe('Maximum results'),
})

const UserPreferencesInputSchema = z.object({
  context: z.string().describe('The current context or topic to find preferences for'),
  projectId: z.string().describe('Project ID to search within'),
  limit: z.number().optional().default(3).describe('Maximum results'),
})

// ==========================================
// HELPER FUNCTIONS
// ==========================================

interface WorldRule {
  rule?: string
  consequence?: string
}

interface Faction {
  name?: string
  ideology?: string
  goals?: string[]
}

interface BibleCharacter {
  name?: string
  role?: string
  description?: string
  currentGoals?: string[]
  fears?: string[]
  selfDelusion?: string
}

interface BibleLocation {
  name?: string
  description?: string
}

function flattenBible(bible: Record<string, unknown>): string {
  if (!bible) return 'Bible is empty.'

  const parts: string[] = []

  if (bible.genre)
    parts.push(`Genre: ${Array.isArray(bible.genre) ? bible.genre.join(', ') : bible.genre}`)
  if (bible.tone)
    parts.push(`Tone: ${Array.isArray(bible.tone) ? bible.tone.join(', ') : bible.tone}`)
  if (bible.centralTheme) parts.push(`Central Theme: ${bible.centralTheme}`)

  if (bible.themes && Array.isArray(bible.themes)) {
    parts.push(`Themes: ${bible.themes.join(', ')}`)
  }

  if (bible.worldRules && Array.isArray(bible.worldRules)) {
    parts.push('\nWorld Rules:')
    bible.worldRules.forEach((r: string | WorldRule) => {
      if (typeof r === 'string') parts.push(`- ${r}`)
      else parts.push(`- ${r.rule} (Consequence: ${r.consequence || 'Not specified'})`)
    })
  }

  if (bible.factions && Array.isArray(bible.factions)) {
    parts.push('\nFactions:')
    bible.factions.forEach((f: Faction) => {
      parts.push(
        `- ${f.name}: ${f.ideology || 'No ideology'} (Goals: ${f.goals?.join(', ') || 'None specified'})`
      )
    })
  }

  if (bible.keyCharacters && Array.isArray(bible.keyCharacters)) {
    parts.push('\nKey Characters:')
    bible.keyCharacters.forEach((c: BibleCharacter) => {
      parts.push(
        `- ${c.name}: ${c.role || 'Role unspecified'} - ${c.description || 'No description'}`
      )
    })
  }

  if (bible.locations && Array.isArray(bible.locations)) {
    parts.push('\nLocations:')
    bible.locations.forEach((l: BibleLocation) => {
      parts.push(`- ${l.name}: ${l.description || 'No description'}`)
    })
  }

  return parts.join('\n')
}

function formatRagResults(results: RagResult[], query: string): string {
  if (results.length === 0) {
    return `No relevant information found for: "${query}"\n\nThis information may not exist in the project's knowledge base.`
  }

  const formattedResults = results
    .map((result, index) => {
      const citation = result.citation || {
        marker: `[${index + 1}]`,
        confidence: result.similarity,
      }
      const confidence = Math.round(citation.confidence * 100)
      const source = result.metadata?.documentType || 'unknown'

      return `${citation.marker} (${source}, ${confidence}% match):\n${result.content}`
    })
    .join('\n\n---\n\n')

  return `Found ${results.length} relevant passages for "${query}":\n\n${formattedResults}`
}

// ==========================================
// MASTRA TOOLS
// ==========================================

export const searchKnowledgeBaseTool = createTool({
  id: 'search_knowledge_base',
  description: `Search the Series Bible and project knowledge base for verified information.

ALWAYS use this tool BEFORE making claims about:
- Character traits, goals, backstory, or relationships
- World rules and their consequences
- Faction ideologies and conflicts
- Past story decisions and their reasoning
- Established lore and continuity

Returns: Relevant passages WITH citation markers (e.g., [1], [2]) for grounding.`,
  inputSchema: SearchKnowledgeBaseInputSchema,
  execute: async (args: any) => {
    const context = args?.context || args
    const { query, projectId, documentTypes, seriesBible, characters, limit = 5 } = context

    console.log(`[RAG] Searching for: "${query}"`)

    const results: string[] = []

    // 1. Search the vector store
    if (projectId) {
      try {
        let ragResults: RagResult[]

        if (documentTypes && documentTypes.length > 0) {
          const typeResults = await Promise.all(
            documentTypes.map(type =>
              ragService.retrieveByType(projectId, type as DocumentType, query, 3)
            )
          )
          ragResults = typeResults.flat().slice(0, limit)
        } else {
          ragResults = await ragService.retrieve(projectId, query, { limit })
        }

        if (ragResults.length > 0) {
          results.push(formatRagResults(ragResults, query))
        }
      } catch (error) {
        console.warn('[RAG] Vector search failed, falling back to in-memory:', error)
      }
    }

    // 2. Also search in-memory bible for immediate context
    if (seriesBible) {
      const bibleText = flattenBible(seriesBible)
      const queryLower = query.toLowerCase()
      const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2)

      const lines = bibleText.split('\n').filter(line => line.trim())
      const relevantLines = lines.filter(line => {
        const lineLower = line.toLowerCase()
        return queryTerms.some(term => lineLower.includes(term))
      })

      if (relevantLines.length > 0) {
        results.push(
          `\n📖 **From Current Session Bible** (live data):\n${relevantLines.join('\n')}`
        )
      }
    }

    // 3. Search characters in state
    if (characters && characters.length > 0) {
      const queryLower = query.toLowerCase()
      const matchingChars = (characters as BibleCharacter[]).filter(
        c =>
          c.name?.toLowerCase().includes(queryLower) ||
          queryLower.includes(c.name?.toLowerCase() || '') ||
          c.currentGoals?.some((g: string) => g.toLowerCase().includes(queryLower)) ||
          c.fears?.some((f: string) => f.toLowerCase().includes(queryLower))
      )

      if (matchingChars.length > 0) {
        const charInfo = matchingChars
          .map(
            c =>
              `- **${c.name}**: Goals: ${c.currentGoals?.join(', ') || 'None'}. ` +
              `Fears: ${c.fears?.join(', ') || 'None'}. ` +
              `Self-delusion: "${c.selfDelusion || 'Unknown'}"`
          )
          .join('\n')

        results.push(`\n👤 **Character State** (current):\n${charInfo}`)
      }
    }

    // 4. Return combined results or no-match message
    if (results.length === 0) {
      return JSON.stringify({
        success: false,
        message: `No information found for "${query}" in the knowledge base.`,
        suggestions: [
          'This information hasn\'t been established yet',
          'The search terms don\'t match existing content',
          'You may need to create this information',
        ],
      })
    }

    return JSON.stringify({
      success: true,
      query,
      content: results.join('\n\n' + '─'.repeat(40) + '\n\n'),
    })
  },
})

export const storeKnowledgeTool = createTool({
  id: 'store_in_knowledge_base',
  description: `Store important information in the project's knowledge base for future retrieval.

Use this to record:
- Decisions and their reasoning
- Character development moments
- World-building additions
- User preferences and feedback`,
  inputSchema: StoreKnowledgeInputSchema,
  execute: async (args: any) => {
    const context = args?.context || args
    const { content, projectId, documentType, metadata } = context

    if (!projectId) {
      return JSON.stringify({ success: false, error: 'No project ID available.' })
    }

    try {
      await ragService.ingest(projectId, content, {
        documentType: documentType as DocumentType,
        ...metadata,
      })

      return JSON.stringify({
        success: true,
        message: `Successfully stored ${documentType} in knowledge base.`,
        documentType,
      })
    } catch (error) {
      console.error('[RAG] Failed to store:', error)
      return JSON.stringify({
        success: false,
        error: `Failed to store: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  },
})

export const searchCharacterHistoryTool = createTool({
  id: 'search_character_history',
  description: 'Search for a specific character\'s development history and arc progression.',
  inputSchema: CharacterHistoryInputSchema,
  execute: async (args: any) => {
    const context = args?.context || args
    const { characterName, projectId, limit = 5 } = context

    if (!projectId) {
      return JSON.stringify({ success: false, error: 'No project ID available.' })
    }

    try {
      const results = await ragService.retrieveCharacterHistory(projectId, characterName, limit)

      if (results.length === 0) {
        return JSON.stringify({
          success: true,
          message: `No history found for character "${characterName}".`,
          results: [],
        })
      }

      return JSON.stringify({
        success: true,
        characterName,
        resultCount: results.length,
        content: formatRagResults(results, `${characterName} history`),
      })
    } catch (error) {
      console.error('[RAG] Character history search failed:', error)
      return JSON.stringify({
        success: false,
        error: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  },
})

export const getUserPreferencesTool = createTool({
  id: 'get_user_preferences',
  description: 'Retrieve user feedback and preferences relevant to the current context.',
  inputSchema: UserPreferencesInputSchema,
  execute: async (args: any) => {
    const context = args?.context || args
    const { context: searchContext, projectId, limit = 3 } = context

    if (!projectId) {
      return JSON.stringify({ success: false, error: 'No project ID available.' })
    }

    try {
      const results = await ragService.retrieveUserPreferences(projectId, searchContext, limit)

      if (results.length === 0) {
        return JSON.stringify({
          success: true,
          message: `No user preferences found related to "${searchContext}".`,
          results: [],
        })
      }

      return JSON.stringify({
        success: true,
        context: searchContext,
        resultCount: results.length,
        content: formatRagResults(results, `user preferences for ${searchContext}`),
      })
    } catch (error) {
      console.error('[RAG] User preferences search failed:', error)
      return JSON.stringify({
        success: false,
        error: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  },
})

export const ragTools = [
  searchKnowledgeBaseTool,
  storeKnowledgeTool,
  searchCharacterHistoryTool,
  getUserPreferencesTool,
]