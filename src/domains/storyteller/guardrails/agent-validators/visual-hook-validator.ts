/**
 * Visual Hook Validator (Gilligan Cold-Open Principle)
 *
 * "What's the first thing we see?" - validates that every scene
 * opens with a concrete visual image, not abstract narration or dialogue.
 */

export interface VisualHookResult {
  /** Whether a visual hook was detected */
  hasVisualHook: boolean
  /** The opening text that was analyzed */
  hookText: string | null
  /** Issue description if no hook found */
  issue: string | null
  /** Score 0-1 where 1 = strong visual opening */
  score: number
}

// Patterns indicating abstract/non-visual openings (bad)
const ABSTRACT_STARTERS = [
  /^it had been/i,
  /^things were/i,
  /^the situation/i,
  /^everyone knew/i,
  /^time passed/i,
  /^in the days since/i,
  /^there was a time/i,
  /^for as long as/i,
  /^it was (a|the)/i,
  /^once upon/i,
  /^the story of/i,
  /^they say that/i,
]

// Patterns indicating the scene opens with dialogue (not ideal for Gilligan style)
const DIALOGUE_STARTERS = [
  /^[""\u201C]/, // Starts with opening quote
  /^[A-Z]{2,}\s*\n/, // Starts with CHARACTER NAME (screenplay format)
]

// Sensory/visual words that indicate a concrete opening image
const SENSORY_WORDS =
  /\b(light|dark|shadow|sound|smell|cold|warm|rain|dust|smoke|blood|stone|metal|glass|silence|crack|flicker|echo|rust|damp|wet|dry|rough|smooth|bright|dim|glow|shimmer|mist|fog|thunder|wind|heat|frost|mud|sand|iron|wood|cloth|leather|steel|concrete|brick|ash|ember|flame|ice)\b/i

// Concrete noun patterns (objects, locations, physical things)
const CONCRETE_NOUNS =
  /\b(door|window|table|chair|wall|floor|ceiling|roof|street|room|desk|bed|knife|sword|gun|book|letter|coin|key|lock|bridge|tower|gate|throne|crown|bottle|cup|plate|lamp|candle|mirror|clock|bell|rope|chain|horse|ship|car|road|path|stairs|corridor|hallway)\b/i

// Physical action patterns (someone doing something visible)
const PHYSICAL_ACTIONS =
  /\b(walked|stood|sat|ran|crouched|leaned|reached|grabbed|dropped|threw|pulled|pushed|opened|closed|turned|looked|stared|watched|held|carried|placed|lifted|poured|broke|cut|struck|fell|climbed|entered|crossed|stepped)\b/i

/**
 * Validate whether a scene opens with a concrete visual hook.
 * Checks the first 2 sentences for sensory language, concrete nouns, and physical actions.
 */
export function validateVisualHook(content: string): VisualHookResult {
  if (!content || content.trim().length === 0) {
    return { hasVisualHook: false, hookText: null, issue: 'No content to analyze', score: 0 }
  }

  // Extract first 2 sentences
  const sentences = content
    .trim()
    .split(/[.!?]+/)
    .filter(s => s.trim().length > 0)
  const openingText = sentences.slice(0, 2).join('. ').trim()

  if (openingText.length === 0) {
    return {
      hasVisualHook: false,
      hookText: null,
      issue: 'Could not extract opening sentences',
      score: 0,
    }
  }

  let score = 0.5 // baseline
  let issue: string | null = null

  // Check for abstract narration (penalty)
  const isAbstract = ABSTRACT_STARTERS.some(p => p.test(openingText))
  if (isAbstract) {
    score -= 0.3
    issue = 'Scene opens with abstract narration instead of a visual image'
  }

  // Check for dialogue opening (mild penalty - Gilligan prefers visual first)
  const startsWithDialogue = DIALOGUE_STARTERS.some(p => p.test(content.trim()))
  if (startsWithDialogue && !isAbstract) {
    score -= 0.15
    issue = 'Scene opens with dialogue instead of a visual establishing shot'
  }

  // Check for sensory words (bonus)
  const hasSensory = SENSORY_WORDS.test(openingText)
  if (hasSensory) score += 0.2

  // Check for concrete nouns (bonus)
  const hasConcrete = CONCRETE_NOUNS.test(openingText)
  if (hasConcrete) score += 0.15

  // Check for physical actions (bonus)
  const hasPhysical = PHYSICAL_ACTIONS.test(openingText)
  if (hasPhysical) score += 0.15

  score = Math.max(0, Math.min(1, score))

  const hasVisualHook = score >= 0.6

  if (!hasVisualHook && !issue) {
    issue = 'Opening lacks concrete sensory details - consider adding a specific visual image'
  }

  return {
    hasVisualHook,
    hookText: openingText.slice(0, 200),
    issue: hasVisualHook ? null : issue,
    score,
  }
}
