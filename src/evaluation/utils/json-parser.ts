
// ==========================================
// JSON PARSING UTILITIES
// ==========================================
// Robust JSON extraction from LLM outputs

/**
 * Extracts and parses JSON from LLM response.
 * Handles common issues:
 * - Code fences (```json ... ```)
 * - Control characters
 * - Trailing commas
 * - Single quotes
 */
export function safeParseJson<T = any>(raw: string): { success: true, data: T } | { success: false, error: string } {
    try {
        // 1. Remove code fences
        let cleaned = raw
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/g, '')
            .trim()

        // 2. Remove control characters (tabs, newlines in strings cause issues)
        cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, ' ')

        // 3. Find JSON object/array boundaries
        const jsonStart = cleaned.indexOf('{')
        const jsonArrayStart = cleaned.indexOf('[')

        let startIdx = -1
        if (jsonStart === -1 && jsonArrayStart === -1) {
            return { success: false, error: 'No JSON found in response' }
        } else if (jsonStart === -1) {
            startIdx = jsonArrayStart
        } else if (jsonArrayStart === -1) {
            startIdx = jsonStart
        } else {
            startIdx = Math.min(jsonStart, jsonArrayStart)
        }

        const isArray = cleaned[startIdx] === '['
        let depth = 0
        let endIdx = startIdx

        for (let i = startIdx; i < cleaned.length; i++) {
            const char = cleaned[i]
            if (char === (isArray ? '[' : '{')) depth++
            if (char === (isArray ? ']' : '}')) depth--
            if (depth === 0) {
                endIdx = i + 1
                break
            }
        }

        const jsonStr = cleaned.substring(startIdx, endIdx)

        // 4. Try to parse
        const data = JSON.parse(jsonStr) as T
        return { success: true, data }

    } catch (e) {
        // 5. Fallback: try even more aggressive cleaning
        try {
            const fallback = raw
                .replace(/[\x00-\x1F\x7F]/g, ' ')
                .replace(/'/g, '"')
                .replace(/,\s*}/g, '}')
                .replace(/,\s*]/g, ']')

            const match = fallback.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
            if (match) {
                const data = JSON.parse(match[0]) as T
                return { success: true, data }
            }
        } catch { }

        return { success: false, error: `Parse failed: ${e}` }
    }
}

/**
 * Extract a specific number from LLM text.
 * Useful when LLM returns "Score: 7/10" instead of JSON.
 */
export function extractScore(text: string): number | null {
    // Try patterns like "7/10", "score: 7", "Rating: 8"
    const patterns = [
        /(\d+(?:\.\d+)?)\s*\/\s*10/i,
        /score[:\s]+(\d+(?:\.\d+)?)/i,
        /rating[:\s]+(\d+(?:\.\d+)?)/i,
        /^(\d+(?:\.\d+)?)$/
    ]

    for (const pattern of patterns) {
        const match = text.match(pattern)
        if (match) {
            return parseFloat(match[1])
        }
    }
    return null
}

/**
 * Normalize score to 0-1 range.
 */
export function normalizeScore(score: number, max: number = 10): number {
    return Math.max(0, Math.min(1, score / max))
}
