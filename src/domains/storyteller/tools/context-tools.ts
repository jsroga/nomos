import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

/**
 * Creates tools for querying the Series Bible context.
 * These allow agents to perform Just-in-Time specific retrieval.
 */
export const createBibleTools = (bible: Record<string, any>) => {
  return [
    new DynamicStructuredTool({
      name: 'search_bible',
      description: 'Search the series bible for specific keywords (rules, factions, lore).',
      schema: z.object({
        query: z.string().describe('The search term'),
        category: z.enum(['rules', 'factions', 'characters', 'general']).optional(),
      }),
      func: async ({ query, category }) => {
        // Naive in-memory search for now.
        // In production this would use vector search or Fuse.js
        console.log(`🔎 Bible Search: "${query}" in [${category || 'all'}]`)

        const results: string[] = []

        const searchIn = (obj: any, path: string) => {
          if (!obj) return
          if (typeof obj === 'string') {
            if (obj.toLowerCase().includes(query.toLowerCase())) {
              results.push(`[${path}]: ${obj.substring(0, 100)}...`)
            }
          } else if (Array.isArray(obj)) {
            obj.forEach((item, i) => searchIn(item, `${path}[${i}]`))
          } else if (typeof obj === 'object') {
            Object.entries(obj).forEach(([k, v]) => searchIn(v, `${path}.${k}`))
          }
        }

        // Target specific sections if requested
        if (category === 'factions' && bible.factions) searchIn(bible.factions, 'factions')
        else if (category === 'rules' && bible.worldRules) searchIn(bible.worldRules, 'worldRules')
        else if (category === 'characters' && bible.keyCharacters)
          searchIn(bible.keyCharacters, 'keyCharacters')
        else searchIn(bible, 'bible')

        if (results.length === 0) return 'No matches found.'
        return results.slice(0, 5).join('\n') // Limit output
      },
    }),

    new DynamicStructuredTool({
      name: 'read_bible_section',
      description: "Read a full section of the bible (e.g. 'factions', 'worldRules', 'sequences').",
      schema: z.object({
        section: z.string().describe('The section key to read'),
      }),
      func: async ({ section }) => {
        if (!bible) return 'Bible empty.'
        const content = bible[section]
        if (!content)
          return `Section '${section}' not found. Available keys: ${Object.keys(bible).join(', ')}`
        return JSON.stringify(content, null, 2)
      },
    }),
    new DynamicStructuredTool({
      name: 'write_memory',
      description:
        'Save a note to the agentic memory (scratchpad). Use this to remember decisions or instructions for future steps.',
      schema: z.object({
        key: z.string().describe('Topic key'),
        value: z.string().describe('The content to remember'),
      }),
      func: async ({ key, value }) => {
        return `Memory [${key}] note created/updated.`
      },
    }),
  ]
}
