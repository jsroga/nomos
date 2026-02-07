
// ==========================================
// MODEL REGISTRY (Phase 10)
// ==========================================
// Centralized configuration for "The Right Brain" (Creative) and "The Critic" (Logic).

// 1. Creative Engine (High Nuance, Subtext, Emotional Intelligence)
// Usage: Story Generation, Character Acting
export const getCreativeModel = (temperature: number = 0.7) => {
    return {
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        temperature
    }
}

// 2. Evaluator Engine (High Speed, Strict Logic, Cost Efficient)
// Usage: EQ Scoring, Logic Checks, Tree Search Evaluation
export const getEvaluatorModel = (temperature: number = 0.0) => {
    if (!process.env.GOOGLE_API_KEY) {
        return {
            provider: 'anthropic',
            model: 'claude-3-haiku-20240307',
            temperature
        }
    }
    return {
        provider: 'google',
        model: 'gemini-1.5-flash',
        temperature
    }
}

// 3. Legacy/Baseline (For consistency with Phase 9)
export const getBaselineModel = () => {
    return {
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        temperature: 0.7
    }
}
