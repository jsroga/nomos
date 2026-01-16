/**
 * RAG Tools for LangChain Agents
 *
 * Production-grade RAG tools using hybrid search (vector + keyword).
 * Provides citation-aware retrieval for grounded generation.
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { WritersRoomState } from '../graph/state'
import { ragService, DocumentType, RagResult, CitationInfo } from '../services/rag-service'

// Helper to flatten bible for quick in-memory search (fallback)
function flattenBible(bible: Record<string, any>): string {
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
    bible.worldRules.forEach((r: any) => {
      if (typeof r === 'string') parts.push(`- ${r}`)
      else parts.push(`- ${r.rule} (Consequence: ${r.consequence || 'Not specified'})`)
    })
  }

  if (bible.factions && Array.isArray(bible.factions)) {
    parts.push('\nFactions:')
    bible.factions.forEach((f: any) => {
      parts.push(
        `- ${f.name}: ${f.ideology || 'No ideology'} (Goals: ${f.goals?.join(', ') || 'None specified'})`
      )
    })
  }

  if (bible.keyCharacters && Array.isArray(bible.keyCharacters)) {
    parts.push('\nKey Characters:')
    bible.keyCharacters.forEach((c: any) => {
      parts.push(
        `- ${c.name}: ${c.role || 'Role unspecified'} - ${c.description || 'No description'}`
      )
    })
  }

  if (bible.locations && Array.isArray(bible.locations)) {
    parts.push('\nLocations:')
    bible.locations.forEach((l: any) => {
      parts.push(`- ${l.name}: ${l.description || 'No description'}`)
    })
  }

  return parts.join('\n')
}

// Format RAG results with citations
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

/**
 * Create the main RAG search tool
 * Uses hybrid search (vector + keyword) with citation tracking
 */
export const createRagTool = (state: WritersRoomState) => {
  return new DynamicStructuredTool({
    name: 'search_series_bible',
    description: `Search the Series Bible and project knowledge base for verified information.

ALWAYS use this tool BEFORE making claims about:
- Character traits, goals, backstory, or relationships
- World rules and their consequences
- Faction ideologies and conflicts
- Past story decisions and their reasoning
- Established lore and continuity

Returns: Relevant passages WITH citation markers (e.g., [1], [2]) for grounding.

IMPORTANT: Reference the citation markers in your response to show your sources.`,
    schema: z.object({
      query: z.string().describe('Natural language search query describing what you want to find'),
      documentTypes: z
        .array(
          z.enum([
            'world_rule',
            'character_arc',
            'beat_decision',
            'episode_summary',
            'user_feedback',
            'agent_reasoning',
          ])
        )
        .optional()
        .describe('Filter by specific document types (optional)'),
      includeInMemoryBible: z
        .boolean()
        .optional()
        .default(true)
        .describe('Also search the in-memory series bible (default: true)'),
    }),
    func: async ({ query, documentTypes, includeInMemoryBible = true }) => {
      console.log(`[RAG] Searching for: "${query}"`)

      const results: string[] = []
      const allCitations: CitationInfo[] = []

      // 1. Search the vector store if we have a projectId
      if (state.projectId) {
        try {
          let ragResults: RagResult[]

          if (documentTypes && documentTypes.length > 0) {
            // Search specific document types
            const typeResults = await Promise.all(
              documentTypes.map(type =>
                ragService.retrieveByType(state.projectId, type as DocumentType, query, 3)
              )
            )
            ragResults = typeResults.flat().slice(0, 5)
          } else {
            // General search
            ragResults = await ragService.retrieve(state.projectId, query, 5)
          }

          if (ragResults.length > 0) {
            results.push(formatRagResults(ragResults, query))

            // Collect citations
            ragResults.forEach(r => {
              if (r.citation) allCitations.push(r.citation)
            })
          }
        } catch (error) {
          console.warn('[RAG] Vector search failed, falling back to in-memory:', error)
        }
      }

      // 2. Also search in-memory bible for immediate context
      if (includeInMemoryBible && state.seriesBible) {
        const bibleText = flattenBible(state.seriesBible)
        const queryLower = query.toLowerCase()
        const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2)

        // Find relevant lines
        const lines = bibleText.split('\n').filter(line => line.trim())
        const relevantLines = lines.filter(line => {
          const lineLower = line.toLowerCase()
          // Match if any query term is found
          return queryTerms.some(term => lineLower.includes(term))
        })

        if (relevantLines.length > 0) {
          results.push(
            `\n📖 **From Current Session Bible** (live data):\n${relevantLines.join('\n')}`
          )
        }
      }

      // 3. Search characters in state
      if (state.characters && state.characters.length > 0) {
        const queryLower = query.toLowerCase()
        const matchingChars = state.characters.filter(
          c =>
            c.name.toLowerCase().includes(queryLower) ||
            queryLower.includes(c.name.toLowerCase()) ||
            c.currentGoals?.some(g => g.toLowerCase().includes(queryLower)) ||
            c.fears?.some(f => f.toLowerCase().includes(queryLower))
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
        // Nothing found anywhere
        return (
          `No information found for "${query}" in the knowledge base.\n\n` +
          'This could mean:\n' +
          '1. This information hasn\'t been established yet\n' +
          '2. The search terms don\'t match existing content\n' +
          '3. You may need to create this information\n\n' +
          'If you need to reference this in your response, clearly state it as a NEW proposal.'
        )
      }

      return results.join('\n\n' + '─'.repeat(40) + '\n\n')
    },
  })
}

/**
 * Create a tool for storing information in the knowledge base
 */
export const createRagStoreTool = (state: WritersRoomState) => {
  return new DynamicStructuredTool({
    name: 'store_in_knowledge_base',
    description: `Store important information in the project's knowledge base for future retrieval.

Use this to record:
- Decisions and their reasoning
- Character development moments
- World-building additions
- User preferences and feedback`,
    schema: z.object({
      content: z.string().describe('The information to store'),
      documentType: z
        .enum([
          'beat_decision',
          'character_arc',
          'world_rule',
          'episode_summary',
          'user_feedback',
          'agent_reasoning',
        ])
        .describe('Type of document'),
      metadata: z
        .object({
          episodeId: z.string().optional(),
          characterId: z.string().optional(),
          beatId: z.string().optional(),
          agentName: z.string().optional(),
        })
        .optional()
        .describe('Additional metadata'),
    }),
    func: async ({ content, documentType, metadata }) => {
      if (!state.projectId) {
        return 'Cannot store: No project ID available.'
      }

      try {
        await ragService.ingest(state.projectId, content, {
          documentType: documentType as DocumentType,
          ...metadata,
        })

        return `✅ Successfully stored ${documentType} in knowledge base.`
      } catch (error) {
        console.error('[RAG] Failed to store:', error)
        return `Failed to store: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    },
  })
}

/**
 * Create a tool for searching character-specific history
 */
export const createCharacterHistoryTool = (state: WritersRoomState) => {
  return new DynamicStructuredTool({
    name: 'search_character_history',
    description: 'Search for a specific character\'s development history and arc progression.',
    schema: z.object({
      characterName: z.string().describe('Name of the character to search'),
    }),
    func: async ({ characterName }) => {
      if (!state.projectId) {
        return 'Cannot search: No project ID available.'
      }

      try {
        const results = await ragService.retrieveCharacterHistory(state.projectId, characterName, 5)

        if (results.length === 0) {
          return `No history found for character "${characterName}".`
        }

        return formatRagResults(results, `${characterName} history`)
      } catch (error) {
        console.error('[RAG] Character history search failed:', error)
        return `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    },
  })
}

/**
 * Create a tool for retrieving user preferences
 */
export const createUserPreferencesTool = (state: WritersRoomState) => {
  return new DynamicStructuredTool({
    name: 'get_user_preferences',
    description: 'Retrieve user feedback and preferences relevant to the current context.',
    schema: z.object({
      context: z.string().describe('The current context or topic to find preferences for'),
    }),
    func: async ({ context }) => {
      if (!state.projectId) {
        return 'Cannot search: No project ID available.'
      }

      try {
        const results = await ragService.retrieveUserPreferences(state.projectId, context, 3)

        if (results.length === 0) {
          return `No user preferences found related to "${context}".`
        }

        return formatRagResults(results, `user preferences for ${context}`)
      } catch (error) {
        console.error('[RAG] User preferences search failed:', error)
        return `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    },
  })
}

// Export all tools for easy access
export const createAllRagTools = (state: WritersRoomState) => [
  createRagTool(state),
  createRagStoreTool(state),
  createCharacterHistoryTool(state),
  createUserPreferencesTool(state),
]
