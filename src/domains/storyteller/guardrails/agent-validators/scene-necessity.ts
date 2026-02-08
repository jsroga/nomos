/**
 * Scene Necessity Validator (Gilligan Rule)
 *
 * "Every scene earns its place" - validates that a beat/scene
 * actually changes something in the story state.
 */

export interface SceneNecessityResult {
    /** Whether the scene passes the necessity check */
    passes: boolean
    /** Detected state change, if any */
    stateChange: string | null
    /** Warnings about the scene */
    warnings: string[]
    /** Score 0-1 where 1 = scene is clearly necessary */
    score: number
}

// Patterns that indicate a state change is happening
const STATE_CHANGE_INDICATORS = [
    // Information revealed
    /\b(discover|reveal|learn|realize|uncover|find out|confess|admit)\b/i,
    // Decision made
    /\b(decide|choose|commit|refuse|accept|reject|agree|betray)\b/i,
    // Relationship shifted
    /\b(trust|distrust|forgive|condemn|ally|betray|confront|reconcile|abandon)\b/i,
    // Stakes raised
    /\b(die|kill|destroy|threaten|deadline|ultimatum|trap|escape|war|siege)\b/i,
    // Power shift
    /\b(overthrow|seize|surrender|negotiate|blackmail|leverage|expose)\b/i,
    // Emotional transformation
    /\b(transform|break|shatter|rebuild|overcome|succumb|embrace|renounce)\b/i,
]

// Patterns suggesting filler / no state change
const FILLER_INDICATORS = [
    /\b(small talk|casual conversation|chat about the weather)\b/i,
    /\b(nothing (important|happened|changed|notable))\b/i,
    /\b(passed the time|killed time|waited around)\b/i,
    /\b(routine|ordinary|uneventful|mundane)\b/i,
]

/**
 * Validate whether a beat/scene actually changes something.
 * Checks the logline and optional content for state-change indicators.
 */
export function validateSceneNecessity(beat: {
    logline: string
    content?: string
    beatType: string
    previousBeat?: { logline: string }
    nextBeat?: { logline: string }
}): SceneNecessityResult {
    const warnings: string[] = []
    const textToCheck = `${beat.logline} ${beat.content || ''}`

    // Check for state change indicators
    const stateChangeMatches = STATE_CHANGE_INDICATORS.filter(p => p.test(textToCheck))
    const hasStateChange = stateChangeMatches.length > 0

    // Check for filler indicators
    const fillerMatches = FILLER_INDICATORS.filter(p => p.test(textToCheck))
    const hasFiller = fillerMatches.length > 0

    // Detect redundancy with adjacent beats
    if (beat.previousBeat) {
        const overlap = detectContentOverlap(beat.logline, beat.previousBeat.logline)
        if (overlap > 0.5) {
            warnings.push(`High overlap (${Math.round(overlap * 100)}%) with previous beat - may be redundant`)
        }
    }

    if (beat.nextBeat) {
        const overlap = detectContentOverlap(beat.logline, beat.nextBeat.logline)
        if (overlap > 0.5) {
            warnings.push(`High overlap (${Math.round(overlap * 100)}%) with next beat - may be redundant`)
        }
    }

    // Score calculation
    let score = 0.5 // baseline

    if (hasStateChange) score += 0.3
    if (hasFiller) score -= 0.3
    if (warnings.length > 0) score -= 0.15 * warnings.length

    // Beat type bonus (some types inherently have state changes)
    const highPurposeTypes = ['revelation', 'decision', 'consequence', 'resolution']
    if (highPurposeTypes.includes(beat.beatType)) {
        score += 0.1
    }

    if (!hasStateChange) {
        warnings.push('No clear state change detected - scene may lack purpose (Gilligan: "Every scene earns its place")')
    }

    if (hasFiller) {
        warnings.push('Scene contains filler indicators - consider elevating with subtext or cutting')
    }

    score = Math.max(0, Math.min(1, score))

    const stateChange = hasStateChange
        ? `State change detected via: ${stateChangeMatches.map(p => p.source.replace(/\\b/g, '').replace(/[()]/g, '')).slice(0, 3).join(', ')}`
        : null

    return {
        passes: score >= 0.5,
        stateChange,
        warnings,
        score,
    }
}

/**
 * Simple word-overlap detection between two texts.
 * Returns 0-1 where 1 = identical word sets.
 */
function detectContentOverlap(textA: string, textB: string): number {
    const wordsA = new Set(textA.toLowerCase().split(/\s+/).filter(w => w.length > 3))
    const wordsB = new Set(textB.toLowerCase().split(/\s+/).filter(w => w.length > 3))

    if (wordsA.size === 0 || wordsB.size === 0) return 0

    let overlap = 0
    for (const word of wordsA) {
        if (wordsB.has(word)) overlap++
    }

    return overlap / Math.max(wordsA.size, wordsB.size)
}
