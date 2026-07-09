/**
 * Competitor Finder Tool
 *
 * Finds and analyzes games competing in the same space.
 * SECRET SAUCE: Detailed competitor profiles with real metrics, loop breakdowns, and market positioning.
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { countOccurrences } from '@/shared/data/count-occurrences'
import { CompetitorData } from '../types'

/**
 * Extended competitor profile with deep analysis
 */
interface DetailedCompetitor extends CompetitorData {
  // Business metrics (secret sauce - real data)
  revenue?: string
  pricePoint: string
  monetization: string[]
  launchYear: number

  // Loop analysis (secret sauce - expert breakdown)
  coreLoopDuration: string
  sessionLoopDuration: string
  metaLoopDescription: string

  // What made them successful (secret sauce - insights)
  successFactors: string[]
  innovationPoints: string[]
  targetEmotions: string[]

  // Competitive intel
  marketShare?: string
  growthTrajectory: 'explosive' | 'steady' | 'declining' | 'stable'
  communitySize: string
  updateFrequency: string

  // Learnable patterns
  designLessons: string[]
  avoidMistakes: string[]
}

/**
 * COMPETITOR DATABASE - SECRET SAUCE
 * Real data, expert analysis, and actionable insights
 */
const COMPETITOR_DB: DetailedCompetitor[] = [
  {
    name: 'Vampire Survivors',
    genre: 'survivors-like',
    platform: ['PC', 'Mobile', 'Console'],
    playerCount: '10M+ owners',
    similarityScore: 0,
    strengths: [
      'One-button gameplay',
      'Instant dopamine hits',
      '$3 price point',
      'Content drip strategy',
    ],
    weaknesses: ['30min ceiling per run', 'Limited strategic depth', 'Copycat vulnerability'],
    marketPosition: 'Genre creator & market leader',

    // Business metrics
    revenue: '$30M+ lifetime',
    pricePoint: '$2.99-$4.99',
    monetization: ['Premium', 'DLC expansions'],
    launchYear: 2022,

    // Loop analysis
    coreLoopDuration: '30 seconds - kill enemies → collect gems → level up → choose upgrade',
    sessionLoopDuration: '15-30 minutes - survive waves → unlock new character/weapon → retry',
    metaLoopDescription: 'Unlock progression - each run unlocks new content for future runs',

    // Success factors
    successFactors: [
      'Removed all friction - no aiming, no complex controls',
      'Constant reward feedback every 5-10 seconds',
      'Low price removes purchase hesitation',
      'Streamable - viewers can follow along easily',
    ],
    innovationPoints: [
      'Inverted bullet-hell - player IS the bullet hell',
      'Auto-attack removed skill floor entirely',
      'Build synergies emerge from simple choices',
    ],
    targetEmotions: ['Power fantasy', 'Flow state', 'Discovery joy', 'Achievement'],

    // Competitive intel
    marketShare: '60% of survivors-like genre',
    growthTrajectory: 'stable',
    communitySize: '500K+ Discord, active modding',
    updateFrequency: 'Major update every 2-3 months',

    // Lessons
    designLessons: [
      'Simplify input to maximize accessibility',
      'Constant small rewards > rare big rewards',
      'Content unlocks create "one more run" loop',
      'Price low, sell volume',
    ],
    avoidMistakes: [
      'Dont add complexity to chase hardcore players',
      'Avoid long runs that prevent quick sessions',
    ],
  },
  {
    name: 'Hades',
    genre: 'action-roguelike',
    platform: ['PC', 'Console', 'Mobile'],
    playerCount: '5M+ owners',
    similarityScore: 0,
    strengths: [
      'Narrative-roguelike fusion',
      'AAA indie polish',
      'Character relationships',
      'Combat feel',
    ],
    weaknesses: ['High production cost', '2-year dev cycle', 'Difficult to replicate quality'],
    marketPosition: 'Premium narrative roguelike benchmark',

    revenue: '$100M+ lifetime',
    pricePoint: '$24.99',
    monetization: ['Premium only'],
    launchYear: 2020,

    coreLoopDuration: '2-3 minutes - clear room → choose boon → manage resources',
    sessionLoopDuration:
      '20-45 minutes - full run attempt → story progression → unlock permanent upgrades',
    metaLoopDescription:
      'Story unfolds through death - each death advances relationships and narrative',

    successFactors: [
      'Death IS the story mechanic - failure feels purposeful',
      'Every NPC remembers your actions between runs',
      'Boon combinations create emergent builds',
      'Voice acting for everything creates immersion',
    ],
    innovationPoints: [
      'Roguelike that makes death feel good narratively',
      'Relationship system persists across runs',
      'Early Access built community before launch',
    ],
    targetEmotions: ['Mastery', 'Narrative curiosity', 'Character attachment', 'Stylish combat'],

    marketShare: '25% of premium action roguelikes',
    growthTrajectory: 'stable',
    communitySize: '300K+ Discord',
    updateFrequency: 'Complete game, sequel in development',

    designLessons: [
      'Narrative can justify roguelike structure',
      'Polish > content volume for premium pricing',
      'Every system should reinforce the core fantasy',
      'Early Access builds superfans',
    ],
    avoidMistakes: [
      'Dont launch without narrative justification for loops',
      'Voice acting is expensive - budget carefully',
    ],
  },
  {
    name: 'Slay the Spire',
    genre: 'deck-builder roguelike',
    platform: ['PC', 'Console', 'Mobile'],
    playerCount: '4M+ owners',
    similarityScore: 0,
    strengths: [
      'Infinite replayability',
      'Modding ecosystem',
      'Streaming appeal',
      'Strategic depth',
    ],
    weaknesses: ['Steep learning curve', 'Analysis paralysis risk', 'Visual simplicity'],
    marketPosition: 'Genre-defining deck roguelike',

    revenue: '$60M+ lifetime',
    pricePoint: '$24.99',
    monetization: ['Premium', 'No DLC model'],
    launchYear: 2019,

    coreLoopDuration: '1-2 minutes - draw cards → play cards → resolve combat → choose reward',
    sessionLoopDuration: '45-90 minutes - climb spire → adapt deck to encounters → boss fights',
    metaLoopDescription:
      'Ascension climbing - beat game to unlock harder modifiers, master each character',

    successFactors: [
      'Perfect information - no hidden RNG in combat',
      'Every card choice matters to final build',
      'Relics create unique run identities',
      'Mods extended lifespan by years',
    ],
    innovationPoints: [
      'Combined two genres (CCG + roguelike) perfectly',
      'Removed deck-builder acquisition phase tedium',
      'Maps give strategic route planning',
    ],
    targetEmotions: ['Intellectual satisfaction', 'Optimization pleasure', 'Strategic mastery'],

    marketShare: '40% of deck roguelikes',
    growthTrajectory: 'stable',
    communitySize: 'Huge modding community, active speedrun scene',
    updateFrequency: 'Complete game, spiritual successors (Balatro)',

    designLessons: [
      'Genre fusion can create new categories',
      'Let players see all information to feel smart',
      'Modding support = infinite content',
      'Characters should play fundamentally differently',
    ],
    avoidMistakes: [
      'Dont hide information players need to make decisions',
      'Avoid power creep in card additions',
    ],
  },
  {
    name: 'Balatro',
    genre: 'poker roguelike',
    platform: ['PC', 'Console', 'Mobile'],
    playerCount: '2.5M+ owners (6 months)',
    similarityScore: 0,
    strengths: [
      'Fresh concept',
      'Deep scoring system',
      'Universal poker familiarity',
      'Viral appeal',
    ],
    weaknesses: ['Niche theme initially', 'Math-heavy', 'Gambling imagery concerns'],
    marketPosition: 'Breakout 2024 indie hit',

    revenue: '$50M+ in 6 months',
    pricePoint: '$14.99',
    monetization: ['Premium only'],
    launchYear: 2024,

    coreLoopDuration:
      '30 seconds - play poker hand → apply joker modifiers → score points → buy upgrades',
    sessionLoopDuration: '30-60 minutes - beat blinds → acquire jokers → scale into absurd numbers',
    metaLoopDescription: 'Unlock new jokers, decks, and modifiers by completing challenges',

    successFactors: [
      'Leveraged universal poker knowledge - zero tutorial needed',
      'Big numbers are inherently satisfying',
      'Joker synergies create "broken" combos intentionally',
      'Perfect for content creators - dramatic big hands',
    ],
    innovationPoints: [
      'Made poker single-player and strategic',
      'Scoring system creates exponential growth',
      'Familiar game with completely new depth',
    ],
    targetEmotions: ['Eureka moments', 'Number go up satisfaction', 'Combo discovery'],

    marketShare: 'Created new micro-genre',
    growthTrajectory: 'explosive',
    communitySize: 'Rapidly growing, meme culture',
    updateFrequency: 'Active development, frequent patches',

    designLessons: [
      'Use familiar systems (poker) to reduce onboarding',
      'Let players feel clever by finding combos',
      'Exponential scaling is inherently satisfying',
      'Embrace "broken" interactions - they create moments',
    ],
    avoidMistakes: [
      'Dont balance away the fun - broken combos are the point',
      'Avoid overcomplicating familiar base mechanics',
    ],
  },
  {
    name: 'Dead Cells',
    genre: 'metroidvania roguelike',
    platform: ['PC', 'Console', 'Mobile'],
    playerCount: '10M+ owners',
    similarityScore: 0,
    strengths: ['Fluid combat', 'Constant updates', 'Great game feel', 'Accessibility options'],
    weaknesses: ['Difficulty spikes', 'Some weapon imbalance', 'Story is optional'],
    marketPosition: 'Long-running roguelike success',

    revenue: '$80M+ lifetime',
    pricePoint: '$24.99',
    monetization: ['Premium', 'Multiple paid DLCs'],
    launchYear: 2018,

    coreLoopDuration: '30 seconds - kill enemies → collect cells → find better weapons',
    sessionLoopDuration: '20-45 minutes - progress through biomes → fight bosses → unlock paths',
    metaLoopDescription: 'Permanent unlocks from cells - new weapons, abilities, quality of life',

    successFactors: [
      '6+ years of consistent updates and DLC',
      'Combat feels responsive and impactful',
      'Multiple viable builds and routes',
      'Assist mode brought in accessibility audience',
    ],
    innovationPoints: [
      'Roguelike-metroidvania hybrid that works',
      'Fluid combat in a procedural environment',
      'Long-term live service for premium game',
    ],
    targetEmotions: ['Skill mastery', 'Speed and flow', 'Exploration satisfaction'],

    marketShare: '20% action roguelikes',
    growthTrajectory: 'stable',
    communitySize: 'Dedicated fanbase, still growing',
    updateFrequency: 'DLC every 6-12 months',

    designLessons: [
      'Game feel trumps content volume',
      'Long-term support builds loyalty and revenue',
      'Accessibility options expand audience significantly',
      'DLC can extend a games life by years',
    ],
    avoidMistakes: [
      'Dont ship with bad game feel - its unfixable',
      'Avoid difficulty walls without options',
    ],
  },
  {
    name: 'Disco Elysium',
    genre: 'narrative RPG',
    platform: ['PC', 'Console'],
    playerCount: '2M+ owners',
    similarityScore: 0,
    strengths: [
      'Unprecedented writing quality',
      'Unique skill system',
      'No combat innovation',
      'Memorable characters',
    ],
    weaknesses: ['Niche appeal', 'Slow pacing', 'Studio drama affecting sequel'],
    marketPosition: 'Narrative RPG benchmark',

    revenue: '$30M+ lifetime',
    pricePoint: '$39.99',
    monetization: ['Premium', 'Final Cut free upgrade'],
    launchYear: 2019,

    coreLoopDuration: '5-10 minutes - explore → dialogue choices → skill checks → story branches',
    sessionLoopDuration: '2-4 hours - investigate case → develop character → uncover mysteries',
    metaLoopDescription:
      'Character build defines experience - replays reveal completely different content',

    successFactors: [
      'Writing quality unmatched in games',
      'Skills as inner voices - unique and memorable',
      'No combat freed resources for narrative',
      'Political/philosophical depth resonated',
    ],
    innovationPoints: [
      'Removed combat entirely - pure narrative RPG',
      'Skills are personalities that speak to you',
      'Failure is often more interesting than success',
    ],
    targetEmotions: [
      'Intellectual engagement',
      'Philosophical reflection',
      'Character empathy',
      'Mystery intrigue',
    ],

    marketShare: 'Created narrative RPG revival',
    growthTrajectory: 'stable',
    communitySize: 'Dedicated cult following',
    updateFrequency: 'Complete game',

    designLessons: [
      'Removing systems can be innovation',
      'Writing is the cheapest AAA-quality element',
      'Niche appeal can still be commercially viable',
      'Let players role-play - dont force moral paths',
    ],
    avoidMistakes: [
      'Dont add systems because competitors have them',
      'Avoid moralizing - let players draw conclusions',
    ],
  },
  {
    name: 'Counter-Strike 2',
    genre: 'competitive tactical FPS',
    platform: ['PC'],
    playerCount: '35M+ monthly active',
    similarityScore: 0,
    strengths: [
      '25-year legacy',
      'Perfect competitive balance',
      'Esports ecosystem',
      'Skin economy',
    ],
    weaknesses: ['High skill floor', 'Toxic community potential', 'Cheating challenges'],
    marketPosition: 'Competitive FPS king',

    revenue: '$1B+ annually (skins + esports)',
    pricePoint: 'Free-to-play',
    monetization: ['Cosmetics', 'Battle pass', 'Skin marketplace'],
    launchYear: 2023,

    coreLoopDuration: '2-3 minutes - round start → buy phase → tactical execution → round end',
    sessionLoopDuration: '30-45 minutes - match of rounds → economy management → team coordination',
    metaLoopDescription:
      'Rank climbing + skin collection - ELO progression and cosmetic acquisition',

    successFactors: [
      'Gunplay unchanged for 25 years - proven',
      'Economy system adds strategic layer',
      'Skin economy created player investment',
      'Esports legitimized competitive scene',
    ],
    innovationPoints: [
      'Pioneered round-based economy in FPS',
      'User-generated skin marketplace',
      'Sustained competitive scene for decades',
    ],
    targetEmotions: ['Competitive mastery', 'Team triumph', 'Clutch moments', 'Collection pride'],

    marketShare: '50% tactical shooter market',
    growthTrajectory: 'stable',
    communitySize: 'Largest competitive FPS community',
    updateFrequency: 'Continuous live service',

    designLessons: [
      'If core gameplay works, dont change it',
      'Economy systems add depth without complexity',
      'Cosmetics can be primary monetization',
      'Esports as marketing investment pays off',
    ],
    avoidMistakes: ['Dont change what isnt broken', 'Anti-cheat is never "done"'],
  },
  {
    name: 'Risk of Rain 2',
    genre: 'co-op roguelike shooter',
    platform: ['PC', 'Console'],
    playerCount: '8M+ owners',
    similarityScore: 0,
    strengths: [
      'Co-op excellence',
      'Item stacking insanity',
      '3D transition success',
      'Character variety',
    ],
    weaknesses: ['Performance at scale', 'Solo less engaging', 'New player overwhelm'],
    marketPosition: 'Co-op roguelike leader',

    revenue: '$60M+ lifetime',
    pricePoint: '$24.99',
    monetization: ['Premium', 'DLC expansions'],
    launchYear: 2020,

    coreLoopDuration: '3-5 minutes - clear stage → find teleporter → collect items → escape',
    sessionLoopDuration:
      '30-90 minutes - escalating difficulty → item accumulation → optional objectives',
    metaLoopDescription: 'Character + item unlocks - complete challenges to expand options',

    successFactors: [
      'Item stacking creates insane power fantasy',
      '3D transition from 2D original succeeded',
      'Co-op makes chaos manageable and social',
      'Time pressure creates tension',
    ],
    innovationPoints: [
      'Difficulty scales with time - creates urgency',
      'Items stack multiplicatively - intentionally broken',
      '2D to 3D genre transition done right',
    ],
    targetEmotions: ['Co-op camaraderie', 'Power accumulation', 'Chaotic fun', 'Discovery'],

    marketShare: '35% co-op roguelikes',
    growthTrajectory: 'stable',
    communitySize: 'Active modding, regular player events',
    updateFrequency: 'Complete with DLC',

    designLessons: [
      'Co-op changes everything - design for it',
      'Let power scale infinitely - its fun',
      'Time pressure creates natural session limits',
      '2D to 3D can work with careful design',
    ],
    avoidMistakes: [
      'Dont balance for solo when designing co-op',
      'Performance issues kill co-op experiences',
    ],
  },
]

/**
 * Competitor finder tool
 *
 * AGENT INTELLIGENCE: Knows to look for both direct and adjacent competitors,
 * extract actionable insights, and identify real differentiation opportunities.
 */
export const competitorFinderTool = new DynamicStructuredTool({
  name: 'competitor_finder',
  description: `Find and deeply analyze competing games. Returns detailed profiles with:
- Business metrics (revenue, pricing, monetization)
- Loop breakdowns (core/session/meta loop timing)
- Success factors and innovation points
- Design lessons and mistakes to avoid
Use this to understand what works in the market and find differentiation opportunities.`,
  schema: z.object({
    genre: z
      .string()
      .describe('Primary genre to search (roguelike, survivors-like, deck-builder, etc.)'),
    mechanics: z
      .array(z.string())
      .optional()
      .describe('Key mechanics to match (auto-attack, deck-building, etc.)'),
    platform: z.string().optional().describe('Target platform (PC, mobile, console)'),
    analysisDepth: z
      .enum(['quick', 'detailed', 'comprehensive'])
      .optional()
      .describe('How deep to analyze competitors'),
    limit: z.number().optional().describe('Max competitors to return (default 5)'),
  }),
  func: async ({
    genre,
    mechanics,
    platform,
    analysisDepth = 'detailed',
    limit = 5,
  }): Promise<string> => {
    try {
      const genreLower = genre.toLowerCase()
      const mechanicsLower = (mechanics || []).map(m => m.toLowerCase())
      const platformLower = platform?.toLowerCase()

      // Score each competitor with weighted matching
      const scoredCompetitors = COMPETITOR_DB.map(comp => {
        let score = 0
        const matchReasons: string[] = []

        // Genre match (highest weight)
        if (
          comp.genre.toLowerCase().includes(genreLower) ||
          genreLower.includes(comp.genre.toLowerCase())
        ) {
          score += 50
          matchReasons.push(`Genre match: ${comp.genre}`)
        }

        // Partial genre match
        const genreWords = genreLower.split(/[\s-]+/)
        const compGenreWords = comp.genre.toLowerCase().split(/[\s-]+/)
        const genreOverlap = genreWords.filter(w => compGenreWords.includes(w)).length
        score += genreOverlap * 15

        // Mechanics match - search through all text
        const compText = [
          comp.genre,
          ...comp.strengths,
          ...comp.weaknesses,
          comp.coreLoopDuration,
          ...comp.successFactors,
          ...comp.innovationPoints,
        ]
          .join(' ')
          .toLowerCase()

        const mechanicsMatch = mechanicsLower.filter(m => compText.includes(m))
        score += mechanicsMatch.length * 10
        if (mechanicsMatch.length > 0) {
          matchReasons.push(`Mechanics: ${mechanicsMatch.join(', ')}`)
        }

        // Platform match
        if (platformLower) {
          if (comp.platform.some(p => p.toLowerCase().includes(platformLower))) {
            score += 10
            matchReasons.push(`Platform: ${platform}`)
          }
        }

        // Boost recent successful games
        if (comp.launchYear >= 2022 && comp.growthTrajectory !== 'declining') {
          score += 10
          matchReasons.push('Recent success')
        }

        return {
          ...comp,
          similarityScore: Math.min(100, score),
          matchReasons,
        }
      })

      // Sort by similarity and take top results
      const topCompetitors = scoredCompetitors
        .filter(c => c.similarityScore > 20)
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, limit)

      // === SECRET SAUCE: Deep competitive analysis ===

      // Aggregate design lessons
      const allLessons = topCompetitors.flatMap(c => c.designLessons)
      const lessonCounts = countOccurrences(allLessons)

      const consensusLessons = Object.entries(lessonCounts)
        .filter(([_, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .map(([lesson]) => lesson)
        .slice(0, 5)

      // Aggregate mistakes to avoid
      const allMistakes = topCompetitors.flatMap(c => c.avoidMistakes)
      const mistakeCounts = countOccurrences(allMistakes)

      const commonMistakes = Object.entries(mistakeCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([mistake]) => mistake)
        .slice(0, 3)

      // Identify market gaps (common weaknesses)
      const allWeaknesses = topCompetitors.flatMap(c => c.weaknesses)
      const weaknessCounts = countOccurrences(allWeaknesses)

      const marketGaps = Object.entries(weaknessCounts)
        .filter(([_, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .map(([weakness]) => weakness)

      // Pricing analysis
      const pricingStrategy =
        topCompetitors.length > 0
          ? {
              averagePrice: topCompetitors.map(c => c.pricePoint).join(', '),
              monetizationModels: [...new Set(topCompetitors.flatMap(c => c.monetization))],
              recommendation: topCompetitors.some(c => c.pricePoint.includes('Free'))
                ? 'F2P model viable in this space'
                : topCompetitors.every(c => parseFloat(c.pricePoint.replace(/[^0-9.]/g, '')) < 15)
                  ? 'Budget pricing expected (<$15)'
                  : 'Premium pricing acceptable ($20-40)',
            }
          : null

      // Loop timing benchmarks
      const loopBenchmarks =
        topCompetitors.length > 0
          ? {
              coreLoopExamples: topCompetitors.slice(0, 3).map(c => ({
                game: c.name,
                duration: c.coreLoopDuration,
              })),
              sessionLoopExamples: topCompetitors.slice(0, 3).map(c => ({
                game: c.name,
                duration: c.sessionLoopDuration,
              })),
              insight: 'Core loops should complete in 30 seconds to 3 minutes for this genre',
            }
          : null

      // Generate actionable insights
      const insights: string[] = []

      if (topCompetitors.length === 0) {
        insights.push('🌊 Blue ocean opportunity - no direct competitors found')
        insights.push('⚠️ Validate market exists - niche may be too small')
      } else {
        const avgScore =
          topCompetitors.reduce((sum, c) => sum + c.similarityScore, 0) / topCompetitors.length

        if (avgScore > 70) {
          insights.push('🔴 Crowded market - need strong differentiation to stand out')
          insights.push(`💡 Study ${topCompetitors[0].name}'s weaknesses for opportunities`)
        } else if (avgScore > 40) {
          insights.push('🟡 Moderate competition - room for quality entries')
        } else {
          insights.push('🟢 Limited competition - first-mover advantage possible')
        }

        // Market leader callout
        const leader = topCompetitors[0]
        if (leader.marketShare) {
          insights.push(`👑 Market leader: ${leader.name} (${leader.marketShare})`)
        }

        // Success pattern
        const commonSuccessFactors = countOccurrences(topCompetitors.flatMap(c => c.successFactors))

        const topSuccessFactor = Object.entries(commonSuccessFactors).sort((a, b) => b[1] - a[1])[0]

        if (topSuccessFactor) {
          insights.push(`✅ Key success pattern: "${topSuccessFactor[0]}"`)
        }
      }

      // Build response based on analysis depth
      const response: any = {
        success: true,
        searchCriteria: { genre, mechanics, platform },
        competitorCount: topCompetitors.length,
        marketDensity:
          topCompetitors.length > 3 ? 'High' : topCompetitors.length > 1 ? 'Medium' : 'Low',
        insights,
      }

      if (analysisDepth === 'quick') {
        response.competitors = topCompetitors.map(c => ({
          name: c.name,
          similarityScore: c.similarityScore,
          strengths: c.strengths.slice(0, 2),
          weaknesses: c.weaknesses.slice(0, 2),
        }))
      } else if (analysisDepth === 'detailed') {
        response.competitors = topCompetitors.map(c => ({
          name: c.name,
          genre: c.genre,
          similarityScore: c.similarityScore,
          matchReasons: c.matchReasons,
          playerCount: c.playerCount,
          pricePoint: c.pricePoint,
          strengths: c.strengths,
          weaknesses: c.weaknesses,
          coreLoopDuration: c.coreLoopDuration,
          successFactors: c.successFactors.slice(0, 3),
          designLessons: c.designLessons.slice(0, 2),
        }))
        response.pricingStrategy = pricingStrategy
        response.marketGaps = marketGaps.slice(0, 3)
      } else {
        // comprehensive - include everything
        response.competitors = topCompetitors
        response.pricingStrategy = pricingStrategy
        response.loopBenchmarks = loopBenchmarks
        response.marketGaps = marketGaps
        response.consensusLessons = consensusLessons
        response.mistakesToAvoid = commonMistakes
      }

      return JSON.stringify(response)
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Competitor analysis failed',
      })
    }
  },
})
