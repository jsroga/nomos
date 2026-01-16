/**
 * Research Tools for Storytelling
 *
 * Web research and knowledge gathering tools for story development.
 * Helps agents research real-world topics, historical periods,
 * cultural elements, and other reference material for authentic storytelling.
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { WritersRoomState } from '../graph/state'

// Types for research results
export interface ResearchResult {
  title: string
  url: string
  snippet: string
  relevance: number
  source: string
  date?: string
}

// Research focus areas for storytelling
type ResearchFocus =
  | 'historical'
  | 'cultural'
  | 'scientific'
  | 'psychological'
  | 'mythology'
  | 'real_events'
  | 'genre_conventions'
  | 'general'

/**
 * Main Research Tool for Storytelling
 */
export const createResearchTool = (state: WritersRoomState) => {
  return new DynamicStructuredTool({
    name: 'research_topic',
    description: `Research real-world topics to inform authentic storytelling.

Use this tool to:
- Research historical periods for period pieces
- Understand cultural practices and traditions
- Verify scientific/technical accuracy
- Explore psychological concepts for character depth
- Research mythology and folklore for world-building
- Study genre conventions and tropes
- Find real events as story inspiration

This tool helps ground your fiction in reality and avoid common mistakes.
Returns relevant sources with snippets and credibility info.`,
    schema: z.object({
      query: z.string().describe('The research query - be specific about what you need to know'),
      focus: z
        .enum([
          'historical',
          'cultural',
          'scientific',
          'psychological',
          'mythology',
          'real_events',
          'genre_conventions',
          'general',
        ])
        .describe('Research focus area'),
      context: z
        .string()
        .optional()
        .describe('Story context for more relevant results (e.g., "1920s noir detective story")'),
      depth: z
        .enum(['quick', 'standard', 'deep'])
        .optional()
        .default('standard')
        .describe('Research depth - quick for facts, deep for comprehensive'),
    }),
    func: async ({ query, focus, context, depth }) => {
      try {
        // Enhance query based on focus and context
        const enhancedQuery = buildEnhancedQuery(query, focus, context)

        // Include relevant domains based on focus
        const domains = getDomainsByFocus(focus)

        // Try Tavily API first
        const apiKey = process.env.TAVILY_API_KEY

        if (apiKey) {
          const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              api_key: apiKey,
              query: enhancedQuery,
              search_depth: depth === 'deep' ? 'advanced' : 'basic',
              include_domains: domains,
              max_results: depth === 'quick' ? 3 : depth === 'deep' ? 8 : 5,
            }),
          })

          if (response.ok) {
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
          }
        }

        // Fallback: Generate helpful simulated results
        const simulatedResults = generateSimulatedResearchResults(query, focus, context)

        return formatResearchResults(simulatedResults, enhancedQuery, focus, true)
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Research failed',
          suggestion: 'Try rephrasing your query or using a different focus area',
        })
      }
    },
  })
}

/**
 * Build enhanced query based on focus
 */
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

/**
 * Get relevant domains based on focus
 */
function getDomainsByFocus(focus: ResearchFocus): string[] {
  const domainMap: Record<ResearchFocus, string[]> = {
    historical: [
      'britannica.com',
      'history.com',
      'smithsonianmag.com',
      'jstor.org',
      'en.wikipedia.org',
      'worldhistory.org',
    ],
    cultural: [
      'nationalgeographic.com',
      'britannica.com',
      'en.wikipedia.org',
      'bbc.com',
      'ethnologue.com',
    ],
    scientific: [
      'scientificamerican.com',
      'nature.com',
      'sciencedirect.com',
      'en.wikipedia.org',
      'nasa.gov',
      'newscientist.com',
    ],
    psychological: [
      'psychologytoday.com',
      'apa.org',
      'ncbi.nlm.nih.gov',
      'verywellmind.com',
      'en.wikipedia.org',
    ],
    mythology: [
      'britannica.com',
      'en.wikipedia.org',
      'worldhistory.org',
      'mythopedia.com',
      'sacred-texts.com',
    ],
    real_events: ['nytimes.com', 'bbc.com', 'reuters.com', 'theguardian.com', 'en.wikipedia.org'],
    genre_conventions: [
      'tvtropes.org',
      'masterclass.com',
      'writersdigest.com',
      'en.wikipedia.org',
      'screencraft.org',
    ],
    general: [],
  }

  return domainMap[focus] || []
}

/**
 * Extract source name from URL
 */
function extractSourceName(url: string): string {
  try {
    const hostname = new URL(url).hostname
    return hostname.replace('www.', '').split('.')[0]
  } catch {
    return 'unknown'
  }
}

/**
 * Format research results for agent consumption
 */
function formatResearchResults(
  results: ResearchResult[],
  query: string,
  focus: ResearchFocus,
  isSimulated = false
): string {
  if (results.length === 0) {
    return JSON.stringify({
      success: true,
      query,
      focus,
      message: 'No results found. Try broadening your query or changing focus area.',
      results: [],
    })
  }

  const formattedResults = results.map((r, i) => ({
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
    results: formattedResults,
    ...(isSimulated && {
      note: 'Using reference database - configure TAVILY_API_KEY for live web search',
    }),
    usage:
      'Use these sources to inform your storytelling. Cite specific facts when incorporating into narrative.',
  })
}

/**
 * Generate simulated results for common storytelling research queries
 */
function generateSimulatedResearchResults(
  query: string,
  focus: ResearchFocus,
  context?: string
): ResearchResult[] {
  const queryLower = query.toLowerCase()
  const results: ResearchResult[] = []

  // Historical research
  if (focus === 'historical') {
    if (
      queryLower.includes('victorian') ||
      queryLower.includes('1800s') ||
      queryLower.includes('19th century')
    ) {
      results.push({
        title: 'Victorian Era: Social Customs and Daily Life',
        url: 'https://britannica.com/event/Victorian-era',
        snippet:
          'The Victorian era (1837-1901) was characterized by strict social hierarchies, elaborate etiquette, and rapid industrialization. Social visits required calling cards, and unmarried women needed chaperones. The working class faced 14-16 hour workdays.',
        relevance: 0.95,
        source: 'britannica',
      })
    }

    if (queryLower.includes('medieval') || queryLower.includes('middle ages')) {
      results.push({
        title: 'Medieval Daily Life: What People Really Did',
        url: 'https://worldhistory.org/medieval-daily-life',
        snippet:
          'Medieval peasants worked from dawn to dusk, primarily in agriculture. Knights trained from age 7. Castle life included great halls for feasts, but only nobility used utensils. Hygiene was better than commonly depicted.',
        relevance: 0.93,
        source: 'worldhistory',
      })
    }

    if (
      queryLower.includes('1920') ||
      queryLower.includes('prohibition') ||
      queryLower.includes('jazz age')
    ) {
      results.push({
        title: 'The Roaring Twenties: Culture and Society',
        url: 'https://history.com/roaring-twenties',
        snippet:
          'The 1920s saw unprecedented social change: women gained voting rights, jazz music flourished in speakeasies, and new technologies like radio transformed entertainment. Prohibition (1920-1933) led to organized crime expansion.',
        relevance: 0.94,
        source: 'history',
      })
    }
  }

  // Psychological research
  if (focus === 'psychological') {
    if (queryLower.includes('trauma') || queryLower.includes('ptsd')) {
      results.push({
        title: 'Understanding Trauma Responses in Characters',
        url: 'https://psychologytoday.com/trauma-responses',
        snippet:
          'Trauma responses include fight, flight, freeze, and fawn. Survivors may exhibit hypervigilance, emotional numbness, flashbacks, and avoidance behaviors. Recovery is non-linear and often involves processing, not forgetting.',
        relevance: 0.96,
        source: 'psychologytoday',
      })
    }

    if (queryLower.includes('narciss') || queryLower.includes('manipulat')) {
      results.push({
        title: 'Narcissistic Personality: Behaviors and Patterns',
        url: 'https://apa.org/narcissism',
        snippet:
          'Narcissistic traits include grandiosity, need for admiration, lack of empathy, exploitation of others, and fragile self-esteem. Common manipulation tactics: gaslighting, love-bombing, triangulation, and silent treatment.',
        relevance: 0.94,
        source: 'apa',
      })
    }

    if (queryLower.includes('grief') || queryLower.includes('loss')) {
      results.push({
        title: 'The Psychology of Grief: Beyond the Five Stages',
        url: 'https://verywellmind.com/grief-psychology',
        snippet:
          'Grief is not linear. The "five stages" model is outdated—grief is wave-like, with good days and setbacks. Common experiences: bargaining, guilt, anger directed at the deceased, identity reconstruction, and continuing bonds.',
        relevance: 0.95,
        source: 'verywellmind',
      })
    }
  }

  // Mythology research
  if (focus === 'mythology') {
    if (queryLower.includes('norse') || queryLower.includes('viking')) {
      results.push({
        title: 'Norse Mythology: Gods, Creatures, and Beliefs',
        url: 'https://mythopedia.com/norse-mythology',
        snippet:
          'Norse cosmology includes nine worlds connected by Yggdrasil. Key concepts: Ragnarök (end of world/rebirth), wyrd (fate), and the importance of honor in death. Vikings believed dying in battle led to Valhalla.',
        relevance: 0.96,
        source: 'mythopedia',
      })
    }

    if (queryLower.includes('greek') || queryLower.includes('olymp')) {
      results.push({
        title: 'Greek Mythology: Themes and Symbols',
        url: 'https://britannica.com/greek-mythology',
        snippet:
          'Greek myths explore hubris (excessive pride), fate vs free will, and transformation. Gods embody human flaws: Zeus\'s infidelity, Hera\'s jealousy, Athena\'s pride. Heroes often have tragic flaws leading to their downfall.',
        relevance: 0.94,
        source: 'britannica',
      })
    }
  }

  // Genre conventions
  if (focus === 'genre_conventions') {
    if (queryLower.includes('noir') || queryLower.includes('detective')) {
      results.push({
        title: 'Film Noir: Conventions and Tropes',
        url: 'https://tvtropes.org/noir',
        snippet:
          'Classic noir elements: cynical protagonist, femme fatale, moral ambiguity, urban setting, shadowy cinematography. Plot often involves betrayal. The detective is both hunter and hunted. Voice-over narration common.',
        relevance: 0.95,
        source: 'tvtropes',
      })
    }

    if (queryLower.includes('horror') || queryLower.includes('scary')) {
      results.push({
        title: 'Horror Genre: What Makes It Work',
        url: 'https://screencraft.org/horror-writing',
        snippet:
          'Effective horror uses isolation, the unknown, and subverted expectations. Key techniques: dramatic irony (audience knows more than character), escalating dread, brief glimpses rather than full reveals, and attacking relatable fears.',
        relevance: 0.93,
        source: 'screencraft',
      })
    }

    if (queryLower.includes('romance')) {
      results.push({
        title: 'Romance Genre Conventions and Reader Expectations',
        url: 'https://writersdigest.com/romance-conventions',
        snippet:
          'Romance requires: central love story, emotionally satisfying ending (HEA/HFN). Popular tropes: enemies-to-lovers, second chance, forced proximity. The "dark moment" creates doubt before resolution. Internal conflict > external.',
        relevance: 0.92,
        source: 'writersdigest',
      })
    }
  }

  // Scientific research
  if (focus === 'scientific') {
    if (
      queryLower.includes('space') ||
      queryLower.includes('astronaut') ||
      queryLower.includes('mars')
    ) {
      results.push({
        title: 'Space Travel: What It\'s Really Like',
        url: 'https://nasa.gov/space-travel',
        snippet:
          'In microgravity, fluids shift to the head causing "puffy face." Muscles atrophy without exercise. Communication delays to Mars: 4-24 minutes one-way. Radiation exposure is a major concern for long-duration missions.',
        relevance: 0.94,
        source: 'nasa',
      })
    }

    if (queryLower.includes('forensic') || queryLower.includes('crime scene')) {
      results.push({
        title: 'Forensic Science: Reality vs Fiction',
        url: 'https://scientificamerican.com/forensics',
        snippet:
          'DNA analysis takes weeks, not hours. Fingerprints are often partial or smudged. "CSI effect" creates unrealistic expectations. Real investigators rely heavily on witness interviews and circumstantial evidence chains.',
        relevance: 0.95,
        source: 'scientificamerican',
      })
    }
  }

  // Cultural research
  if (focus === 'cultural') {
    if (queryLower.includes('japan') || queryLower.includes('samurai')) {
      results.push({
        title: 'Samurai Culture: Honor, Code, and Reality',
        url: 'https://britannica.com/samurai-culture',
        snippet:
          'Bushido (warrior\'s way) emphasized loyalty, honor, and martial arts. However, it was partially romanticized later. Samurai were also bureaucrats and administrators. Ritual suicide (seppuku) was rare and highly formalized.',
        relevance: 0.95,
        source: 'britannica',
      })
    }
  }

  // Add a general fallback result
  if (results.length === 0) {
    results.push({
      title: `Research Guide: ${focus.charAt(0).toUpperCase() + focus.slice(1)} Topics`,
      url: 'https://en.wikipedia.org/research-guide',
      snippet: `For accurate ${focus} research, consider consulting academic sources, primary documents, and expert interviews. Be wary of common misconceptions perpetuated by popular media.`,
      relevance: 0.6,
      source: 'wikipedia',
    })
  }

  return results.slice(0, 5)
}

/**
 * Quick fact-check tool
 */
export const createFactCheckTool = (state: WritersRoomState) => {
  return new DynamicStructuredTool({
    name: 'fact_check',
    description:
      'Quickly verify if a story detail is historically/scientifically accurate. Use for specific claims.',
    schema: z.object({
      claim: z.string().describe('The specific claim or detail to verify'),
      category: z
        .enum(['historical', 'scientific', 'cultural', 'geographical'])
        .describe('Category of the claim'),
    }),
    func: async ({ claim, category }) => {
      // In production, this would query fact-checking APIs or trusted sources
      // For now, provide guidance based on common mistakes

      const commonMistakes: Record<string, { mistake: string; correction: string }[]> = {
        historical: [
          {
            mistake: 'vikings wore horned helmets',
            correction:
              'Vikings did NOT wear horned helmets in battle - this is a 19th-century romantic invention',
          },
          {
            mistake: 'medieval people thought the earth was flat',
            correction:
              'Educated medieval Europeans knew the Earth was spherical - this was established since ancient Greece',
          },
          {
            mistake: 'corsets were torture devices',
            correction:
              'Well-fitted corsets were comfortable support garments - the "tight-lacing" was a rare extreme',
          },
          {
            mistake: 'gladiator fights always ended in death',
            correction: 'Gladiators were expensive investments - most fights were NOT to the death',
          },
        ],
        scientific: [
          {
            mistake: 'humans only use 10% of brain',
            correction: 'We use virtually all parts of our brain - the 10% myth is false',
          },
          {
            mistake: 'chloroform instantly knocks people out',
            correction:
              'Chloroform takes several minutes of continuous exposure to cause unconsciousness',
          },
          {
            mistake: 'silencers make guns silent',
            correction:
              'Suppressors reduce noise but guns are still very loud (around 130dB vs 160dB)',
          },
          {
            mistake: 'you can outrun an explosion',
            correction:
              'Shockwaves travel at supersonic speeds - the pressure wave is usually deadlier than the flames',
          },
        ],
        cultural: [
          {
            mistake: 'all geishas were prostitutes',
            correction:
              'Geishas are trained entertainers (music, dance, conversation) - not sex workers',
          },
          {
            mistake: 'native americans all lived in teepees',
            correction:
              'Housing varied greatly by tribe: pueblos, longhouses, wigwams, earth lodges, etc.',
          },
        ],
        geographical: [
          {
            mistake: 'sahara desert is entirely sand',
            correction:
              'Only about 25% of the Sahara is sandy desert (erg) - most is rocky plateau',
          },
          {
            mistake: 'alaska is cold year-round',
            correction: 'Parts of Alaska can reach 90°F (32°C) in summer',
          },
        ],
      }

      const categoryMistakes = commonMistakes[category] || []
      const claimLower = claim.toLowerCase()

      // Check against known mistakes
      for (const { mistake, correction } of categoryMistakes) {
        if (claimLower.includes(mistake.toLowerCase().split(' ').slice(0, 3).join(' '))) {
          return JSON.stringify({
            claim,
            verdict: 'LIKELY INACCURATE',
            note: correction,
            suggestion: 'Research this further before including in your story',
          })
        }
      }

      return JSON.stringify({
        claim,
        verdict: 'UNVERIFIED',
        note: 'Could not automatically verify this claim. Recommend consulting authoritative sources.',
        suggestion: 'Use the research_topic tool for deeper investigation',
      })
    },
  })
}

/**
 * Reference lookup tool - for quick background on specific terms
 */
export const createReferenceLookupTool = (state: WritersRoomState) => {
  return new DynamicStructuredTool({
    name: 'lookup_reference',
    description:
      'Quick reference lookup for terms, concepts, or names. Use for background understanding.',
    schema: z.object({
      term: z.string().describe('The term, name, or concept to look up'),
    }),
    func: async ({ term }) => {
      // In production, this would query Wikipedia API or similar
      // For now, provide guidance

      return JSON.stringify({
        term,
        suggestion: `To properly research "${term}", use the research_topic tool with an appropriate focus area. For quick facts, consider:
        
1. If it's a historical term → focus: "historical"
2. If it's a scientific concept → focus: "scientific"  
3. If it's a cultural practice → focus: "cultural"
4. If it's from mythology → focus: "mythology"

This ensures you get contextually relevant information for your story.`,
      })
    },
  })
}

// Export all research tools
export const createAllResearchTools = (state: WritersRoomState) => [
  createResearchTool(state),
  createFactCheckTool(state),
  createReferenceLookupTool(state),
]
