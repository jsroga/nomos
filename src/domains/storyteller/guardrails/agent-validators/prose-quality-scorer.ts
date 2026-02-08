/**
 * Prose Quality Scorer (Anti-Slop)
 *
 * Pattern-matching validator that scores prose quality 0-1.
 * Based on the ANTI_SLOP_METRIC criteria from confident-ai/metrics.ts.
 * 
 * Categories:
 * 1. Hedging / AI vocabulary
 * 2. Purple prose
 * 3. Telling not showing
 * 4. Redundancy
 * 5. Empty intensifiers
 * 6. Weak verbs
 * 7. Vague descriptions
 * 8. Villain monologue / exposition dumps
 */

// ============================================
// Pattern definitions by category
// ============================================

const SLOP_PATTERNS: Record<string, { patterns: RegExp[]; weight: number; description: string }> = {
    hedging: {
        patterns: [
            /it['']s important to note/gi,
            /it['']s worth mentioning/gi,
            /\bin many ways\b/gi,
            /\bit should be noted\b/gi,
        ],
        weight: 0.8,
        description: 'AI hedging phrases',
    },
    aiVocab: {
        patterns: [
            /\bdelve into\b/gi,
            /\btapestry of\b/gi,
            /\bmyriad of\b/gi,
            /\bresonate with\b/gi,
            /\blandscape of\b/gi,
            /\bthe key is\b/gi,
            /\bunveiling\b/gi,
            /\bembark on\b/gi,
            /\bnavigating\b/gi,
        ],
        weight: 1.0,
        description: 'AI vocabulary patterns',
    },
    purpleProse: {
        patterns: [
            /\borbs\b/gi,           // "orbs" for eyes
            /crimson liquid/gi,     // blood
            /obsidian locks/gi,     // black hair
            /\bpools of\b.*\beyes\b/gi,
            /\balabaster\b/gi,
            /\bporcelain skin\b/gi,
        ],
        weight: 1.2,
        description: 'Purple prose / overwrought descriptions',
    },
    tellingNotShowing: {
        patterns: [
            /\btension was palpable\b/gi,
            /\ba chill ran down\b/gi,
            /\bher? heart (pounded|raced|hammered)\b/gi,
            /\bhis? blood ran cold\b/gi,
            /\beyes widened in shock\b/gi,
            /\blittle did (they|he|she) know\b/gi,
            /\b(he|she|they) felt (sad|happy|angry|scared)\b/gi,
            /\bif only (he|she|they) knew\b/gi,
        ],
        weight: 1.0,
        description: 'Telling emotions instead of showing',
    },
    redundancy: {
        patterns: [
            /nodded (his|her|their) head/gi,
            /shrugged (his|her|their) shoulders/gi,
            /blinked (his|her|their) eyes/gi,
            /\bsat down\b/gi,
            /\bstood up\b/gi,
        ],
        weight: 0.5,
        description: 'Redundant descriptions',
    },
    emptyIntensifiers: {
        patterns: [
            /\bvery\b/gi,
            /\breally\b/gi,
            /\bextremely\b/gi,
            /\bcompletely\b/gi,
            /\butterly\b/gi,
            /\babsolutely\b/gi,
        ],
        weight: 0.3,
        description: 'Empty intensifiers',
    },
    villainMonologue: {
        patterns: [
            /\byou see,?\s+(my|the)\b/gi,
            /\blet me explain\b/gi,
            /\byou fool\b/gi,
            /\bas you know,?\s+\w+\b/gi,  // "as you know, Bob"
            /\bdo you know what I['']ve\b/gi,
        ],
        weight: 1.5,
        description: 'Villain monologue / "as you know Bob" exposition',
    },
    deusExMachina: {
        patterns: [
            /\bjust in time\b/gi,
            /\bat the last (moment|second|minute)\b/gi,
            /\bmiraculously\b/gi,
            /\bconveniently\b/gi,
            /\bas luck would have it\b/gi,
        ],
        weight: 1.2,
        description: 'Deus ex machina / convenient timing',
    },
}

// ============================================
// Scoring
// ============================================

export interface ProseQualityResult {
    /** Overall quality score 0-1 (1 = clean, 0 = heavy slop) */
    score: number
    /** List of specific matches found */
    flags: Array<{
        category: string
        match: string
        description: string
    }>
    /** Overall category */
    category: 'clean' | 'acceptable' | 'needs-work' | 'slop'
    /** Total weighted penalty */
    totalPenalty: number
}

/**
 * Score prose quality by detecting AI slop patterns.
 * Returns 0-1 where 1 = clean professional writing, 0 = heavy AI slop.
 * 
 * Only checks narration, not quoted dialogue (some slop patterns are
 * valid in character speech).
 */
export function scoreProseQuality(text: string): ProseQualityResult {
    if (!text || text.trim().length === 0) {
        return { score: 1, flags: [], category: 'clean', totalPenalty: 0 }
    }

    // Strip quoted dialogue to avoid false positives on character speech
    const narrationOnly = text.replace(/"[^"]*"/g, '').replace(/\"[^\"]*\"/g, '')

    const flags: ProseQualityResult['flags'] = []
    let totalPenalty = 0

    for (const [category, config] of Object.entries(SLOP_PATTERNS)) {
        for (const pattern of config.patterns) {
            const matches = narrationOnly.match(pattern)
            if (matches) {
                for (const match of matches) {
                    flags.push({
                        category,
                        match: match.trim(),
                        description: config.description,
                    })
                    totalPenalty += config.weight
                }
            }
        }
    }

    // Normalize penalty based on text length (longer text gets more tolerance)
    const wordCount = narrationOnly.split(/\s+/).length
    const normalizedPenalty = wordCount > 0
        ? Math.min(totalPenalty / Math.max(wordCount / 100, 1), 5) / 5
        : 0

    const score = Math.max(0, Math.min(1, 1 - normalizedPenalty))

    let category: ProseQualityResult['category']
    if (score >= 0.8) category = 'clean'
    else if (score >= 0.6) category = 'acceptable'
    else if (score >= 0.4) category = 'needs-work'
    else category = 'slop'

    return { score, flags, category, totalPenalty }
}

// Re-export as AntiSlopValidator for backward compatibility with index.ts
export const AntiSlopValidator = { scoreProseQuality }
export const createAntiSlopValidator = () => AntiSlopValidator
