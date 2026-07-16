/**
 * Pattern Matcher Tool
 *
 * Matches loop patterns against known successful game design archetypes.
 *
 * SECRET SAUCE: Deep structural analysis including:
 * - Loop architecture detection (core/session/meta)
 * - Feedback system analysis
 * - Tension/release patterns
 * - Player agency assessment
 * - Engagement hook identification
 */

import { z } from 'zod'
import { createLoopStructuredTool } from './structured-tool'
import {
  buildPatternAnalysisText,
  buildPatternCompatibility,
  buildPatternInsights,
  collectTopPatternRisks,
  findSuggestedPatterns,
  scoreDesignPatterns,
  type DesignPatternDefinition,
} from './pattern-matcher-analysis'

/**
 * Comprehensive game design patterns with deep analysis
 */
interface DesignPattern extends DesignPatternDefinition {
  coreElements: string[]
}

const DESIGN_PATTERNS: DesignPattern[] = [
  // === LOOP STRUCTURE PATTERNS ===
  {
    name: 'Core Loop Trinity',
    category: 'loop_structure',
    description:
      'The fundamental Challenge → Action → Reward cycle that creates satisfying moment-to-moment gameplay',
    coreElements: [
      'Clear challenge presented',
      'Player takes action',
      'Immediate feedback/reward',
      'Loop resets',
    ],
    indicators: [
      { term: 'challenge', weight: 3 },
      { term: 'action', weight: 2 },
      { term: 'reward', weight: 3 },
      { term: 'feedback', weight: 3 },
      { term: 'loop', weight: 2 },
      { term: 'cycle', weight: 2 },
    ],
    antiPatterns: [
      'No clear challenge',
      'Delayed feedback',
      'Unclear rewards',
      'Broken loop transitions',
    ],
    examples: [
      {
        game: 'Vampire Survivors',
        implementation:
          'Kill enemies (challenge) → Auto-attack (action) → XP gems (reward) → Level up (reset)',
      },
      {
        game: 'Candy Crush',
        implementation:
          'Match goal (challenge) → Swap candies (action) → Clear animation (reward) → Next level (reset)',
      },
    ],
    implementationGuide: [
      'Ensure each challenge is immediately readable',
      'Keep action-to-feedback time under 500ms',
      'Make rewards visually and audibly satisfying',
      'Create clear moment where loop resets',
    ],
    strengths: ['Universal engagement', 'Easy to understand', 'Highly replayable'],
    risks: ['Can feel repetitive without variety', 'May become mindless without depth'],
    compatibility: ['Power Fantasy', 'Collection Loop', 'Synergy Building'],
  },
  {
    name: 'Nested Loop Architecture',
    category: 'loop_structure',
    description:
      'Multiple loops operating at different timescales (moment/session/meta) creating layered engagement',
    coreElements: [
      'Core loop (seconds)',
      'Session loop (minutes)',
      'Meta loop (hours/days)',
      'Cross-loop rewards',
    ],
    indicators: [
      { term: 'meta', weight: 4 },
      { term: 'session', weight: 3 },
      { term: 'run', weight: 3 },
      { term: 'permanent', weight: 4 },
      { term: 'unlock', weight: 3 },
      { term: 'progression', weight: 3 },
    ],
    antiPatterns: ['Loops don\'t connect', 'Meta-loop invalidates core loop', 'No reason to return'],
    examples: [
      {
        game: 'Hades',
        implementation:
          'Combat rooms (core) → Full escape attempt (session) → Story + permanent upgrades (meta)',
      },
      {
        game: 'Dead Cells',
        implementation: 'Enemy encounters (core) → Full run (session) → Cells + blueprints (meta)',
      },
    ],
    implementationGuide: [
      'Each loop should feel complete on its own',
      'Higher loops should enhance, not replace, lower loops',
      'Meta rewards should affect core loop feel, not just numbers',
      'Session boundaries should feel natural, not forced',
    ],
    strengths: ['Long-term engagement', 'Multiple satisfaction points', 'Reason to return'],
    risks: ['Complex to balance', 'Meta can overshadow core', 'Overwhelming for new players'],
    compatibility: ['Roguelike Persistence', 'Skill Expression', 'Collection Loop'],
  },

  // === PROGRESSION PATTERNS ===
  {
    name: 'Power Fantasy Escalation',
    category: 'progression',
    description:
      'Player becomes increasingly powerful throughout a session, creating satisfying growth curves',
    coreElements: ['Starting weak', 'Visible power growth', 'Peak power moment', 'Optional reset'],
    indicators: [
      { term: 'power', weight: 3 },
      { term: 'upgrade', weight: 4 },
      { term: 'evolution', weight: 4 },
      { term: 'level', weight: 2 },
      { term: 'scale', weight: 3 },
      { term: 'stronger', weight: 2 },
      { term: 'overpowered', weight: 3 },
    ],
    antiPatterns: [
      'Power plateaus too early',
      'Enemies scale equally',
      'No visible power difference',
    ],
    examples: [
      {
        game: 'Vampire Survivors',
        implementation: 'Start with 1 weapon → evolve to 6+ weapons → screen-filling destruction',
      },
      {
        game: 'Risk of Rain 2',
        implementation: 'Weak start → item stacking → god-mode with 50+ items',
      },
    ],
    implementationGuide: [
      'Let players feel noticeably stronger every few minutes',
      'Create "wow" moments where power becomes ridiculous',
      'Visual clarity should grow with power',
      'Audio should escalate with power',
    ],
    strengths: ['Highly satisfying', 'Clear feedback', 'Streamable moments'],
    risks: ['Difficulty balancing', 'Early game may feel weak', 'End-game may feel trivial'],
    compatibility: ['Synergy Building', 'Core Loop Trinity', 'Session Boundaries'],
  },
  {
    name: 'Roguelike Persistence',
    category: 'progression',
    description: 'Permanent unlocks that persist between runs, giving meaning to every failure',
    coreElements: [
      'Runs end (death/completion)',
      'Currency/XP carries over',
      'Unlock new content',
      'Runs become easier/different',
    ],
    indicators: [
      { term: 'permanent', weight: 4 },
      { term: 'unlock', weight: 4 },
      { term: 'persistent', weight: 4 },
      { term: 'meta', weight: 3 },
      { term: 'death', weight: 2 },
      { term: 'run', weight: 3 },
      { term: 'attempt', weight: 2 },
    ],
    antiPatterns: ['Nothing carries over', 'Unlocks don\'t matter', 'Grinding required'],
    examples: [
      {
        game: 'Hades',
        implementation: 'Darkness crystals → Mirror upgrades → Fundamentally change playstyle',
      },
      {
        game: 'Slay the Spire',
        implementation: 'Complete runs → Unlock new cards → Expand deck possibilities',
      },
    ],
    implementationGuide: [
      'Every run should unlock something meaningful',
      'Early unlocks should change gameplay, not just boost numbers',
      'Show progress toward next unlock during runs',
      'Make "just one more run" compelling',
    ],
    strengths: ['Reduces frustration', 'Long-term goals', 'Encourages experimentation'],
    risks: ['Can trivialize difficulty', 'Grind perception', 'New content dilutes pools'],
    compatibility: ['Nested Loop Architecture', 'Build Diversity', 'Collection Loop'],
  },

  // === ENGAGEMENT PATTERNS ===
  {
    name: 'Synergy Building',
    category: 'engagement',
    description:
      'Combining elements creates emergent, powerful combinations that reward experimentation',
    coreElements: [
      'Individual elements have clear effects',
      'Combinations multiply effects',
      'Discovery is rewarding',
      'Broken combos intentional',
    ],
    indicators: [
      { term: 'synergy', weight: 5 },
      { term: 'combo', weight: 4 },
      { term: 'combine', weight: 3 },
      { term: 'build', weight: 3 },
      { term: 'multiply', weight: 3 },
      { term: 'stack', weight: 3 },
      { term: 'interact', weight: 2 },
    ],
    antiPatterns: ['Items don\'t combine', 'Linear scaling only', 'One optimal build'],
    examples: [
      {
        game: 'Balatro',
        implementation: 'Jokers multiply each other → Millions in score from single hand',
      },
      {
        game: 'Slay the Spire',
        implementation: 'Strength + heavy blade + vulnerable → Massive single hits',
      },
    ],
    implementationGuide: [
      'Design elements with combination in mind',
      'Let some combos be intentionally overpowered',
      'Make discovering synergies feel like player skill',
      'Maintain build diversity - no single best combo',
    ],
    strengths: ['Depth without complexity', 'Experimentation rewarded', 'Streamable discoveries'],
    risks: ['Balance nightmares', 'Information overload', 'Trap builds'],
    compatibility: ['Power Fantasy', 'Build Diversity', 'Core Loop Trinity'],
  },
  {
    name: 'Tension-Release Cycle',
    category: 'engagement',
    description: 'Building pressure followed by satisfying resolution creates emotional engagement',
    coreElements: [
      'Tension builds over time',
      'Stakes increase',
      'Release point clearly defined',
      'Cathartic resolution',
    ],
    indicators: [
      { term: 'wave', weight: 4 },
      { term: 'boss', weight: 4 },
      { term: 'escalat', weight: 3 },
      { term: 'survive', weight: 3 },
      { term: 'timer', weight: 3 },
      { term: 'pressure', weight: 3 },
      { term: 'climax', weight: 2 },
    ],
    antiPatterns: [
      'Constant high tension (exhausting)',
      'No stakes (boring)',
      'Anticlimactic resolution',
    ],
    examples: [
      {
        game: 'Vampire Survivors',
        implementation: 'Enemies escalate → 30 min Death arrives → Survive or die',
      },
      {
        game: 'Resident Evil 4',
        implementation: 'Resource scarcity builds → Boss fight → Item cache reward',
      },
    ],
    implementationGuide: [
      'Create natural peaks and valleys in intensity',
      'Make stakes clear and meaningful',
      'Resolution should be proportional to tension',
      'Allow recovery periods',
    ],
    strengths: ['Emotional investment', 'Memorable moments', 'Natural pacing'],
    risks: ['Exhausting if unrelenting', 'Anticlimactic if mistuned', 'Difficulty balance'],
    compatibility: ['Session Boundaries', 'Skill Expression', 'Boss Encounters'],
  },

  // === FEEDBACK PATTERNS ===
  {
    name: 'Dopamine Rhythm',
    category: 'feedback',
    description:
      'Constant micro-rewards at predictable intervals creating addictive feedback loops',
    coreElements: [
      'Frequent small rewards',
      'Visual/audio feedback',
      'Predictable timing',
      'Anticipation building',
    ],
    indicators: [
      { term: 'xp', weight: 4 },
      { term: 'gem', weight: 4 },
      { term: 'collect', weight: 3 },
      { term: 'drop', weight: 3 },
      { term: 'pickup', weight: 3 },
      { term: 'constant', weight: 3 },
      { term: 'frequent', weight: 3 },
    ],
    antiPatterns: ['Rewards too rare', 'No feedback on collection', 'Random timing'],
    examples: [
      {
        game: 'Vampire Survivors',
        implementation: 'XP gems every second → Level up every 30s → Evolution every 5min',
      },
      {
        game: 'Diablo',
        implementation: 'Gold drops constantly → Items drop regularly → Legendaries occasionally',
      },
    ],
    implementationGuide: [
      'Aim for reward every 5-10 seconds minimum',
      'Layer different reward frequencies',
      'Audio cues should be satisfying but not annoying',
      'Visual feedback should be clear and juicy',
    ],
    strengths: ['Highly addictive', 'Flow state inducing', 'Hard to stop playing'],
    risks: ['Can feel mindless', 'May not appeal to all players', 'Addiction concerns'],
    compatibility: ['Core Loop Trinity', 'Power Fantasy', 'Collection Loop'],
  },
  {
    name: 'Skill Expression',
    category: 'feedback',
    description: 'Mechanics that visibly reward player skill, creating mastery motivation',
    coreElements: [
      'High skill ceiling',
      'Visible skill difference',
      'Mastery feels earned',
      'Practice rewarded',
    ],
    indicators: [
      { term: 'skill', weight: 4 },
      { term: 'master', weight: 3 },
      { term: 'difficult', weight: 2 },
      { term: 'precision', weight: 3 },
      { term: 'timing', weight: 3 },
      { term: 'dodge', weight: 3 },
      { term: 'reflex', weight: 3 },
    ],
    antiPatterns: ['Skill doesn\'t matter', 'RNG dominates outcomes', 'Low ceiling'],
    examples: [
      {
        game: 'Celeste',
        implementation: 'Perfect movement → Faster times → Style points from advanced techniques',
      },
      {
        game: 'Hollow Knight',
        implementation: 'Boss patterns learned → Clean kills → Radiant difficulty',
      },
    ],
    implementationGuide: [
      'Ensure skilled play is noticeably better',
      'Create opportunities for style/optimization',
      'Provide optional challenges for mastery',
      'Replay systems to showcase skill',
    ],
    strengths: ['Long-term engagement', 'Competitive potential', 'Speedrun/content creator appeal'],
    risks: ['High skill floor alienates casuals', 'Frustration', 'Community elitism'],
    compatibility: ['Tension-Release', 'Competitive Structure', 'Difficulty Options'],
  },

  // === PLAYER EXPERIENCE PATTERNS ===
  {
    name: 'Collection/Unlock Loop',
    category: 'player_experience',
    description: 'Discovering and unlocking new content drives exploration and completionism',
    coreElements: [
      'Clear unlock conditions',
      'Content revelation',
      'Collection tracking',
      'Completionist goals',
    ],
    indicators: [
      { term: 'unlock', weight: 4 },
      { term: 'collect', weight: 4 },
      { term: 'achievement', weight: 3 },
      { term: 'discover', weight: 3 },
      { term: 'secret', weight: 3 },
      { term: 'character', weight: 2 },
      { term: 'weapon', weight: 2 },
    ],
    antiPatterns: ['Nothing to unlock', 'Unlocks are meaningless', 'Too easy to complete'],
    examples: [
      {
        game: 'Enter the Gungeon',
        implementation: '200+ guns to find → NPCs to rescue → Secrets in every run',
      },
      { game: 'Smash Bros', implementation: 'Character roster to unlock → Stages → Collectibles' },
    ],
    implementationGuide: [
      'Front-load exciting unlocks, taper to rarities',
      'Track progress visibly',
      'Make unlocks change gameplay, not just cosmetics',
      'Include long-tail content for completionists',
    ],
    strengths: ['Long-term motivation', 'Content revelation pacing', 'Completionist appeal'],
    risks: ['Grind perception', 'FOMO', 'Content exhaustion'],
    compatibility: ['Roguelike Persistence', 'Nested Loops', 'Power Fantasy'],
  },
  {
    name: 'Build Diversity',
    category: 'player_experience',
    description: 'Multiple viable playstyles allowing player expression and replayability',
    coreElements: [
      'Distinct playstyles possible',
      'No single optimal build',
      'Character/loadout variety',
      'Adaptation required',
    ],
    indicators: [
      { term: 'build', weight: 4 },
      { term: 'class', weight: 3 },
      { term: 'playstyle', weight: 4 },
      { term: 'loadout', weight: 3 },
      { term: 'character', weight: 2 },
      { term: 'variety', weight: 3 },
      { term: 'different', weight: 2 },
    ],
    antiPatterns: ['One best build', 'Characters feel same', 'Forced adaptation'],
    examples: [
      {
        game: 'Slay the Spire',
        implementation: '4 characters × multiple deck archetypes × relic combinations',
      },
      {
        game: 'Path of Exile',
        implementation:
          'Infinite skill tree combinations → Class identity → League-specific builds',
      },
    ],
    implementationGuide: [
      'Design each option to feel meaningfully different',
      'Balance through variety, not homogenization',
      'Enable player-discovered builds',
      'Content should support multiple approaches',
    ],
    strengths: ['Replayability', 'Player expression', 'Community theorycrafting'],
    risks: ['Balance maintenance', 'Information overload', 'Trap builds'],
    compatibility: ['Synergy Building', 'Skill Expression', 'Roguelike Persistence'],
  },
  {
    name: 'Session Boundaries',
    category: 'player_experience',
    description: 'Clear start/end points enabling portable play and natural stopping',
    coreElements: [
      'Defined session length',
      'Natural endpoints',
      'Progress saved meaningfully',
      'Easy to resume',
    ],
    indicators: [
      { term: 'run', weight: 4 },
      { term: 'session', weight: 4 },
      { term: 'round', weight: 3 },
      { term: 'match', weight: 3 },
      { term: 'minute', weight: 2 },
      { term: 'quick', weight: 2 },
      { term: 'portable', weight: 2 },
    ],
    antiPatterns: ['No good stopping points', 'Progress lost on exit', 'Indefinite sessions'],
    examples: [
      {
        game: 'Slay the Spire',
        implementation: '45-60 min runs → Clear floor checkpoints → Can exit mid-run',
      },
      {
        game: 'Into the Breach',
        implementation: '30 min campaigns → Turn-based allows any-time exit',
      },
    ],
    implementationGuide: [
      'Design for your target session length',
      'Create natural pause points within sessions',
      'Save state should be robust',
      'Return context should be clear',
    ],
    strengths: ['Portable play', 'Lower commitment', 'Easier to pick up'],
    risks: ['May feel disconnected', 'Narrative challenges', 'Mobile-centric'],
    compatibility: ['Nested Loop Architecture', 'Roguelike Persistence', 'Quick Sessions'],
  },
]

const patternMatcherSchema = z.object({
  mechanics: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        description: z.string().optional(),
      })
    )
    .describe('List of game mechanics to analyze'),
  connections: z
    .array(
      z.object({
        source: z.string(),
        target: z.string(),
        label: z.string().optional(),
      })
    )
    .optional()
    .describe('Connections between mechanics'),
  gameGenre: z.string().optional().describe('Game genre for context'),
  gameDescription: z.string().optional().describe('Overall game description'),
})

/**
 * Pattern matcher tool with sophisticated analysis
 */
export const patternMatcherTool = createLoopStructuredTool({
  name: 'pattern_matcher',
  description: `Analyze game loop against known successful design patterns. Returns:
- Which patterns the design follows and how well
- Missing patterns that could strengthen the design
- Implementation guidance for each pattern
- Compatibility analysis between patterns

Patterns include: Loop structures, Progression systems, Engagement hooks, Feedback systems, Player experience patterns.`,
  schema: patternMatcherSchema,
  func: async input => {
    const parsed = patternMatcherSchema.parse(input)
    try {
      const allText = buildPatternAnalysisText(parsed)
      const matches = scoreDesignPatterns(DESIGN_PATTERNS, allText)
      const suggestedPatterns = findSuggestedPatterns(DESIGN_PATTERNS, parsed.gameGenre, matches)
      const topPatterns = matches.slice(0, 3)
      const compatibilityAnalysis = buildPatternCompatibility(topPatterns)
      const insights = buildPatternInsights(matches)
      const topRisks = collectTopPatternRisks(matches).slice(0, 3)

      const strongMatches = matches.filter(match => match.matchScore >= 60)
      const moderateMatches = matches.filter(
        match => match.matchScore >= 35 && match.matchScore < 60,
      )
      const categories = new Set(matches.map(match => match.category))

      return JSON.stringify({
        success: true,
        matchedPatterns: matches.map(match => ({
          patternName: match.patternName,
          category: match.category,
          matchScore: match.matchScore,
          description: match.description,
          applicability: match.applicability,
          examples: match.examples,
          implementationGuide: match.implementationGuide,
          risks: match.risks,
        })),
        patternSummary: {
          strongMatches: strongMatches.length,
          moderateMatches: moderateMatches.length,
          weakMatches: matches.length - strongMatches.length - moderateMatches.length,
          categoriesCovered: Array.from(categories),
        },
        suggestedPatterns,
        compatibilityAnalysis,
        insights,
        topRisks,
        overallAssessment:
          matches.length === 0
            ? 'No strong pattern matches found. Consider implementing core design patterns starting with Core Loop Trinity.'
            : strongMatches.length >= 2
              ? `Strong design foundation with ${strongMatches.length} well-implemented patterns. Focus on: ${strongMatches.map(match => match.patternName).join(', ')}`
              : `Developing design with ${matches.length} detected patterns. Strengthen: ${matches
                  .slice(0, 2)
                  .map(match => match.patternName)
                  .join(', ')}`,
      })
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Pattern matching failed',
      })
    }
  },
})
