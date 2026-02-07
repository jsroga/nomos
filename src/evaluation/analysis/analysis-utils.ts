
// ==========================================
// ANALYSIS UTILITIES (Phase 10.17-10.18)
// ==========================================
// Token-per-Emotion efficiency and Latent Space Mapping

export interface TokenEfficiencyResult {
    totalTokens: number
    emotionalDensity: number  // Emotions per 100 tokens
    topEmotions: string[]
    efficiency: 'high' | 'medium' | 'low'
}

/**
 * Calculate Token-per-Emotion efficiency.
 * 
 * Measures how efficiently the text conveys emotional content.
 * High efficiency = rich emotional content with few tokens.
 */
export function calculateTokenEfficiency(text: string): TokenEfficiencyResult {
    // Simple tokenization (split on whitespace)
    const tokens = text.split(/\s+/).filter(t => t.length > 0)
    const totalTokens = tokens.length

    // Emotion keywords (simplified lexicon)
    const emotionKeywords: Record<string, string[]> = {
        anger: ['angry', 'furious', 'rage', 'frustrated', 'irritated', 'clenched', 'seething'],
        fear: ['afraid', 'scared', 'terrified', 'nervous', 'anxious', 'trembling', 'panic'],
        sadness: ['sad', 'depressed', 'grief', 'sorrow', 'tears', 'crying', 'heartbroken'],
        joy: ['happy', 'joyful', 'elated', 'excited', 'thrilled', 'laughing', 'smile'],
        disgust: ['disgusted', 'revulsion', 'repulsed', 'sickened', 'contempt', 'disdain'],
        surprise: ['surprised', 'shocked', 'astonished', 'startled', 'stunned', 'amazed'],
        love: ['love', 'affection', 'adoration', 'warmth', 'tenderness', 'devotion'],
        trust: ['trust', 'faith', 'confidence', 'reliable', 'loyal', 'dependable']
    }

    const emotionCounts: Record<string, number> = {}
    const textLower = text.toLowerCase()

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
        for (const keyword of keywords) {
            if (textLower.includes(keyword)) {
                emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1
            }
        }
    }

    const totalEmotions = Object.values(emotionCounts).reduce((a, b) => a + b, 0)
    const emotionalDensity = totalTokens > 0 ? (totalEmotions / totalTokens) * 100 : 0

    // Top 3 emotions
    const topEmotions = Object.entries(emotionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([emotion]) => emotion)

    // Efficiency rating
    let efficiency: 'high' | 'medium' | 'low' = 'low'
    if (emotionalDensity > 5) efficiency = 'high'
    else if (emotionalDensity > 2) efficiency = 'medium'

    return { totalTokens, emotionalDensity, topEmotions, efficiency }
}

// ==========================================
// LATENT SPACE MAPPING (Conflict States)
// ==========================================
// Maps dialogue to a 2D conflict space (Valence x Arousal)

export interface ConflictState {
    valence: number  // -1 (negative) to +1 (positive)
    arousal: number  // 0 (calm) to 1 (intense)
    label: string
}

export const CONFLICT_QUADRANTS = {
    HighArousalNegative: { label: 'Explosive Conflict', example: 'Screaming match' },
    HighArousalPositive: { label: 'Passionate Reconciliation', example: 'Tearful reunion' },
    LowArousalNegative: { label: 'Cold War', example: 'Silent treatment' },
    LowArousalPositive: { label: 'Peaceful Resolution', example: 'Calm understanding' }
}

/**
 * Map text to Valence-Arousal conflict space.
 */
export function mapToConflictSpace(text: string): ConflictState {
    const textLower = text.toLowerCase()

    // Valence markers
    const positiveMarkers = ['love', 'hope', 'smile', 'agree', 'understand', 'forgive', 'sorry', 'thank']
    const negativeMarkers = ['hate', 'despise', 'anger', 'betray', 'liar', 'disgust', 'never', 'wrong']

    // Arousal markers
    const highArousalMarkers = ['!', 'scream', 'shout', 'slam', 'punch', 'tears', 'explode', 'rage']
    const lowArousalMarkers = ['whisper', 'pause', 'silent', 'slowly', 'quiet', 'calm', 'sigh']

    let valenceScore = 0
    let arousalScore = 0.5 // Default to middle

    for (const marker of positiveMarkers) {
        if (textLower.includes(marker)) valenceScore += 0.15
    }
    for (const marker of negativeMarkers) {
        if (textLower.includes(marker)) valenceScore -= 0.15
    }
    for (const marker of highArousalMarkers) {
        if (textLower.includes(marker)) arousalScore += 0.1
    }
    for (const marker of lowArousalMarkers) {
        if (textLower.includes(marker)) arousalScore -= 0.1
    }

    // Clamp values
    valenceScore = Math.max(-1, Math.min(1, valenceScore))
    arousalScore = Math.max(0, Math.min(1, arousalScore))

    // Determine quadrant label
    let label = 'Neutral'
    if (arousalScore > 0.5 && valenceScore < 0) label = CONFLICT_QUADRANTS.HighArousalNegative.label
    else if (arousalScore > 0.5 && valenceScore > 0) label = CONFLICT_QUADRANTS.HighArousalPositive.label
    else if (arousalScore <= 0.5 && valenceScore < 0) label = CONFLICT_QUADRANTS.LowArousalNegative.label
    else if (arousalScore <= 0.5 && valenceScore > 0) label = CONFLICT_QUADRANTS.LowArousalPositive.label

    return { valence: valenceScore, arousal: arousalScore, label }
}
