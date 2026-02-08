/**
 * Screenplay Format Rules Engine (S4)
 *
 * Detects what the user is currently writing and provides
 * context for autocomplete and formatting.
 */

export type ScriptElement =
    | 'scene_heading'    // INT./EXT. lines
    | 'character_name'   // ALL CAPS on own line
    | 'dialogue'         // Lines after character name
    | 'parenthetical'    // (direction) after character name
    | 'action'           // Everything else
    | 'transition'       // CUT TO:, FADE TO:, etc.

const SCENE_HEADING_RE = /^(INT|EXT)\./i
const TRANSITION_RE = /^(CUT TO|FADE TO|FADE IN|FADE OUT|SMASH CUT TO|DISSOLVE TO|MATCH CUT TO|WIPE TO|JUMP CUT TO)\s*:?/i
const ALL_CAPS_RE = /^[A-Z][A-Z\s.'()-]{1,}$/
const PARENTHETICAL_RE = /^\s*\(/
const TRANSITION_KEYWORDS = new Set([
    'CUT', 'FADE', 'SMASH', 'DISSOLVE', 'MATCH', 'WIPE', 'JUMP',
    'CONTINUED', 'MORE', 'CONT\'D',
])

export interface ScriptElementInfo {
    element: ScriptElement
    lineText: string
    lineIndex: number
}

/**
 * Detect what screenplay element the user is currently writing.
 */
export function detectCurrentElement(
    text: string,
    cursorPosition: number
): ScriptElementInfo {
    const lines = text.split('\n')

    // Find which line the cursor is on
    let charCount = 0
    let currentLineIdx = 0
    for (let i = 0; i < lines.length; i++) {
        charCount += lines[i].length + 1 // +1 for \n
        if (charCount >= cursorPosition) {
            currentLineIdx = i
            break
        }
    }

    const currentLine = lines[currentLineIdx] || ''
    const prevLine = currentLineIdx > 0 ? lines[currentLineIdx - 1]?.trim() || '' : ''

    const element = classifyLine(currentLine.trim(), prevLine)

    return {
        element,
        lineText: currentLine,
        lineIndex: currentLineIdx,
    }
}

/**
 * Classify a line of screenplay text.
 */
function classifyLine(line: string, prevLine: string): ScriptElement {
    if (!line || line.length === 0) return 'action'

    // Scene heading: INT./EXT.
    if (SCENE_HEADING_RE.test(line)) return 'scene_heading'

    // Transition: CUT TO:, FADE TO:, etc.
    if (TRANSITION_RE.test(line)) return 'transition'

    // Parenthetical: starts with (
    if (PARENTHETICAL_RE.test(line)) {
        // Only if previous line was a character name or another parenthetical
        if (ALL_CAPS_RE.test(prevLine) || PARENTHETICAL_RE.test(prevLine)) {
            return 'parenthetical'
        }
    }

    // ALL CAPS = character name (if not a transition keyword)
    if (ALL_CAPS_RE.test(line) && line.length >= 2) {
        const firstWord = line.split(/\s/)[0]
        if (!TRANSITION_KEYWORDS.has(firstWord)) {
            return 'character_name'
        }
    }

    // Dialogue: line after a character name or parenthetical
    if (ALL_CAPS_RE.test(prevLine) || PARENTHETICAL_RE.test(prevLine)) {
        const prevFirstWord = prevLine.split(/\s/)[0]
        if (!TRANSITION_KEYWORDS.has(prevFirstWord)) {
            return 'dialogue'
        }
    }

    return 'action'
}

export interface ElementRules {
    /** Which autocomplete provider to use */
    autocompleteType: 'character' | 'location' | 'transition' | 'parenthetical' | null
    /** Whether to show AI ghost-text suggestions */
    ghostTextEnabled: boolean
}

/**
 * Get rules for the current screenplay element.
 */
export function getElementRules(element: ScriptElement): ElementRules {
    switch (element) {
        case 'character_name':
            return { autocompleteType: 'character', ghostTextEnabled: false }
        case 'scene_heading':
            return { autocompleteType: 'location', ghostTextEnabled: false }
        case 'transition':
            return { autocompleteType: 'transition', ghostTextEnabled: false }
        case 'parenthetical':
            return { autocompleteType: 'parenthetical', ghostTextEnabled: false }
        case 'dialogue':
            return { autocompleteType: null, ghostTextEnabled: true }
        case 'action':
        default:
            return { autocompleteType: null, ghostTextEnabled: true }
    }
}
