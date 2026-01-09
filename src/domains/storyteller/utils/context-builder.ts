import { WritersRoomState } from '../graph/state'

/**
 * Builds a standardized, XML-structured context for agents.
 * Follows Anthropic's "Effective Context Engineering" guidelines.
 */
export function buildAgentContext(
    state: WritersRoomState,
    focus: 'general' | 'premise' | 'plot' | 'writing' = 'general',
    additionalInstructions?: string
): string {
    const parts: string[] = []

    // 1. MASTER INSTRUCTIONS (System Level)
    if (state.masterPrompt) {
        parts.push(`<master_instructions>
${state.masterPrompt}
</master_instructions>`)
    }

    // 2. EPISODE CONTEXT
    if ((state.seriesBible && (state.seriesBible.title || state.seriesBible.logline)) || state.episodePremise) {
        parts.push(`<episode_context>
Series: ${state.seriesBible.title || 'Untitled'}
Logline: ${state.seriesBible.logline || 'N/A'}
Theme: ${state.seriesBible.centralTheme || 'N/A'}

${state.episodePremise ? `CURRENT EPISODE PREMISE:
Title: ${state.episodePremise.title}
Logline: ${state.episodePremise.logline}
Hook: ${state.episodePremise.theHook}
Flaw: ${state.episodePremise.fatalFlaw}
Stakes: ${state.episodePremise.stakes}
Outcome: ${state.episodePremise.inevitableConsequence}
` : 'Episode premise is currently being defined.'}

${state.episodePrompt ? `EPISODE SPECIFIC INSTRUCTIONS:
${state.episodePrompt}` : ''}
</episode_context>`)
    }

    // 3. WORLD RULES (Filtered or Full)
    // For now, we include high-level rules. JIT retrieval will allow deep dives.
    const rules = state.seriesBible.worldRules || []
    if (rules.length > 0) {
        parts.push(`<world_rules>
${rules.slice(0, 5).map((r: any) => `- [${r.category}] ${r.rule}`).join('\n')}
${rules.length > 5 ? `\n... (Use search_bible to find ${rules.length - 5} more rules)` : ''}
</world_rules>`)
    }

    // 4. ACTIVE CAST (Focus on relevant characters)
    const cast = state.characters || []
    const activeIds = state.activeCast || []
    const relevantCast = activeIds.length > 0
        ? cast.filter(c => activeIds.includes(c.characterId))
        : cast.slice(0, 5) // Fallback to top 5 if no active selection

    if (relevantCast.length > 0) {
        parts.push(`<active_cast>
${relevantCast.map(c =>
            `- ${c.name}: ${c.actualMotivation || 'Motivation unknown'}. (Status: Valence ${c.metrics?.valence}, Arousal ${c.metrics?.arousal})`
        ).join('\n')}
</active_cast>`)
    }

    // 5. MEMORY / SCRATCHPAD
    // Assuming we implement memory in Phase 3. Placeholder for now.
    // if (state.memory) { ... }

    // 6. TASK SPECIFIC INSTRUCTIONS
    if (additionalInstructions) {
        parts.push(`<task_instructions>
${additionalInstructions}
</task_instructions>`)
    }

    return parts.join('\n\n')
}
