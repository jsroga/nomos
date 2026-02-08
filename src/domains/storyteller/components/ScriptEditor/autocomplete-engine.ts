/**
 * Script Autocomplete Engine (S1)
 *
 * Provides screenplay-aware completion providers for
 * character names, scene headings, transitions, and parentheticals.
 */

export interface CompletionItem {
    /** Display text in popup */
    label: string
    /** Text to insert when accepted */
    insertText: string
    /** Kind of completion */
    kind: 'character' | 'location' | 'transition' | 'parenthetical' | 'ai'
    /** Secondary info (role, episode) */
    detail?: string
    /** Priority in list (lower = higher priority) */
    sortOrder: number
}

export interface ScriptContext {
    characters: Array<{ name: string; role: string }>
    locations: string[]
    currentScene?: string
    recentDialogue?: string[]
    projectId: string
}

export interface CompletionProvider {
    type: 'character' | 'location' | 'transition' | 'parenthetical'
    getCompletions: (prefix: string, ctx: ScriptContext) => CompletionItem[]
}

// ============================================
// CHARACTER PROVIDER
// Triggers when typing ALL CAPS at line start
// ============================================

export const characterProvider: CompletionProvider = {
    type: 'character',
    getCompletions: (prefix: string, ctx: ScriptContext): CompletionItem[] => {
        const upper = prefix.toUpperCase()
        return ctx.characters
            .filter(c => c.name.toUpperCase().startsWith(upper))
            .map(c => ({
                label: c.name.toUpperCase(),
                insertText: c.name.toUpperCase(),
                kind: 'character' as const,
                detail: c.role,
                sortOrder: 0,
            }))
    },
}

// ============================================
// SCENE HEADING / LOCATION PROVIDER
// Triggers on INT. or EXT.
// ============================================

export const sceneHeadingProvider: CompletionProvider = {
    type: 'location',
    getCompletions: (prefix: string, ctx: ScriptContext): CompletionItem[] => {
        const intExt = prefix.split('.')[0]?.toUpperCase() || 'INT'
        const afterDot = prefix.replace(/^(INT|EXT)\.\s*/i, '')

        return ctx.locations
            .filter(loc => !afterDot || loc.toUpperCase().startsWith(afterDot.toUpperCase()))
            .flatMap(loc => [
                {
                    label: `${intExt}. ${loc} - DAY`,
                    insertText: `${intExt}. ${loc} - DAY`,
                    kind: 'location' as const,
                    sortOrder: 0,
                },
                {
                    label: `${intExt}. ${loc} - NIGHT`,
                    insertText: `${intExt}. ${loc} - NIGHT`,
                    kind: 'location' as const,
                    sortOrder: 1,
                },
            ])
    },
}

// ============================================
// TRANSITION PROVIDER
// Triggers on CUT, FADE, SMASH, DISSOLVE, etc.
// ============================================

const STANDARD_TRANSITIONS = [
    'CUT TO:', 'FADE TO:', 'FADE IN:', 'FADE OUT.',
    'SMASH CUT TO:', 'DISSOLVE TO:', 'MATCH CUT TO:',
    'WIPE TO:', 'JUMP CUT TO:', 'TIME CUT:',
]

export const transitionProvider: CompletionProvider = {
    type: 'transition',
    getCompletions: (prefix: string): CompletionItem[] => {
        const upper = prefix.toUpperCase()
        return STANDARD_TRANSITIONS
            .filter(t => t.startsWith(upper))
            .map(t => ({
                label: t,
                insertText: t,
                kind: 'transition' as const,
                sortOrder: 0,
            }))
    },
}

// ============================================
// PARENTHETICAL PROVIDER
// After character name, typing (
// ============================================

const COMMON_PARENTHETICALS = [
    '(beat)', '(sotto)', '(continuing)', '(O.S.)', '(V.O.)',
    '(whispering)', '(angry)', '(to self)', '(into phone)',
    '(laughing)', '(sarcastically)', '(pause)', '(gently)',
    '(firm)', '(shouting)', '(under breath)', '(re: the letter)',
]

export const parentheticalProvider: CompletionProvider = {
    type: 'parenthetical',
    getCompletions: (prefix: string): CompletionItem[] => {
        const lower = prefix.toLowerCase()
        return COMMON_PARENTHETICALS
            .filter(p => p.toLowerCase().startsWith(lower))
            .map(p => ({
                label: p,
                insertText: p,
                kind: 'parenthetical' as const,
                sortOrder: 0,
            }))
    },
}

// ============================================
// PROVIDER REGISTRY
// ============================================

export const COMPLETION_PROVIDERS: Record<string, CompletionProvider> = {
    character: characterProvider,
    location: sceneHeadingProvider,
    transition: transitionProvider,
    parenthetical: parentheticalProvider,
}

/**
 * Get completions for the current context.
 */
export function getCompletions(
    providerType: string,
    prefix: string,
    context: ScriptContext
): CompletionItem[] {
    const provider = COMPLETION_PROVIDERS[providerType]
    if (!provider) return []
    return provider.getCompletions(prefix, context)
}
