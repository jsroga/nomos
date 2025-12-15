import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { WritersRoomState } from '../graph/state'

// Helper to flatten bible for searching
function flattenBible(bible: Record<string, any>): string {
  if (!bible) return "Bible is empty.";
  
  // Create a searchable text representation
  const parts: string[] = [];
  
  if (bible.genre) parts.push(`Genre: ${bible.genre}`);
  if (bible.tone) parts.push(`Tone: ${bible.tone}`);
  
  if (bible.themes && Array.isArray(bible.themes)) {
    parts.push(`Themes: ${bible.themes.join(', ')}`);
  }
  
  if (bible.worldRules && Array.isArray(bible.worldRules)) {
    parts.push("World Rules:");
    bible.worldRules.forEach((r: any) => {
      if (typeof r === 'string') parts.push(`- ${r}`);
      else parts.push(`- ${r.rule} (Consequence: ${r.consequence})`);
    });
  }
  
  if (bible.factions && Array.isArray(bible.factions)) {
    parts.push("Factions:");
    bible.factions.forEach((f: any) => {
      parts.push(`- ${f.name}: ${f.ideology} (Goals: ${f.goals?.join(', ')})`);
    });
  }
  
  if (bible.locations && Array.isArray(bible.locations)) {
    parts.push("Locations:");
    bible.locations.forEach((l: any) => {
      parts.push(`- ${l.name}: ${l.description}`);
    });
  }
  
  return parts.join('\n');
}

// In a real app, this would query a Vector Store (Pinecone/Supabase pgvector)
// For this MVP/Prototype, we do a simple keyword filter on the in-memory bible.
export const createRagTool = (state: WritersRoomState) => {
  return new DynamicStructuredTool({
    name: 'search_series_bible',
    description: 'Search the Series Bible for information about world rules, factions, characters, or lore. Use this to check facts before creating content.',
    schema: z.object({
      query: z.string().describe('The search query (e.g., "magic system", "factions", "protagonist motivation")'),
    }),
    func: async ({ query }) => {
      console.log(`[RAG] Searching bible for: "${query}"`);
      
      const bibleText = flattenBible(state.seriesBible);
      
      // Simple fuzzy match simulation
      // In reality, this would be vectorStore.similaritySearch(query)
      const lines = bibleText.split('\n');
      const relevantLines = lines.filter(line => 
        line.toLowerCase().includes(query.toLowerCase())
      );
      
      if (relevantLines.length === 0) {
        // Fallback: return summary if no specific match
        return `No exact matches found for "${query}". \n\nBible Summary:\n${bibleText.slice(0, 500)}...`;
      }
      
      return `Found ${relevantLines.length} matches for "${query}":\n\n${relevantLines.join('\n')}`;
    },
  });
};








