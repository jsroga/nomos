/**
 * Script Edit Operations
 *
 * Handles AI-powered script editing operations similar to how Cursor edits code.
 */

import { HumanMessage, SystemMessage } from '@langchain/core/messages'

// Lazy model getter - only creates model when actually called (server-side only)
let _model: ReturnType<typeof import('../config/model-config').getModel> | null = null
async function getModelLazy() {
  if (!_model) {
    // Dynamic import to avoid bundling model-config on client
    const { getModel } = await import('../config/model-config')
    _model = getModel('writer')
  }
  return _model
}

export interface EditProposal {
  id: string
  originalText: string
  newText: string
  instruction: string
  status: 'pending' | 'accepted' | 'rejected'
  timestamp: number
}

const SCRIPT_EDITOR_PROMPT = `You are a screenplay editor. Your task is to edit the selected text according to the user's instruction.

RULES:
1. Maintain proper screenplay format (INT./EXT. scene headings, CHARACTER NAMES in caps, etc.)
2. Preserve the voice and tone of the existing script
3. Keep character names consistent
4. Only edit what's necessary - don't rewrite beyond the scope of the instruction
5. Return ONLY the edited text, no explanations or commentary

SCREENPLAY FORMAT REFERENCE:
- Scene headings: INT. LOCATION - DAY/NIGHT or EXT. LOCATION - DAY/NIGHT
- Action lines: Present tense, visual descriptions
- Character names: ALL CAPS before dialogue
- Dialogue: Regular case, centered conceptually
- Parentheticals: (in parentheses), for delivery notes only`

export async function regenerateText(
  selection: string,
  instruction: string,
  context?: {
    beforeText?: string
    afterText?: string
    characterVoices?: Record<string, string>
  }
): Promise<string> {
  const contextInfo = context
    ? `
SURROUNDING CONTEXT:
Before: "${context.beforeText?.slice(-200) || ''}"
After: "${context.afterText?.slice(0, 200) || ''}"

${
  context.characterVoices
    ? `CHARACTER VOICES:\n${Object.entries(context.characterVoices)
        .map(([name, voice]) => `- ${name}: ${voice}`)
        .join('\n')}`
    : ''
}
`
    : ''

  const messages = [
    new SystemMessage(SCRIPT_EDITOR_PROMPT),
    new HumanMessage(`${contextInfo}

SELECTED TEXT TO EDIT:
"""
${selection}
"""

INSTRUCTION: ${instruction}

Return only the edited text:`),
  ]

  try {
    const model = await getModelLazy()
    const response = await model.invoke(messages)
    const content =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
    return content.trim()
  } catch (error) {
    console.error('Script regeneration failed:', error)
    throw error
  }
}

export async function expandScene(selection: string): Promise<string> {
  return regenerateText(
    selection,
    'Expand this section with more visual detail, sensory descriptions, and beat-by-beat action. Add subtext to any dialogue. Make it more cinematic.'
  )
}

export async function condenseScene(selection: string): Promise<string> {
  return regenerateText(
    selection,
    'Condense this to its essential elements. Remove redundant action lines, tighten dialogue, but keep the core dramatic beats.'
  )
}

export async function improveDialogue(
  selection: string,
  characterName: string,
  voiceNotes?: string
): Promise<string> {
  return regenerateText(
    selection,
    `Improve this dialogue for ${characterName}. ${voiceNotes ? `Voice notes: ${voiceNotes}.` : ''} Make it more natural, add subtext, and ensure it reveals character while advancing the scene.`
  )
}

export async function addVisualHook(selection: string): Promise<string> {
  return regenerateText(
    selection,
    "Add a strong visual hook to open this scene. What's the first, most striking image we see? Make it iconic and meaningful."
  )
}

export async function shiftTone(selection: string, targetTone: string): Promise<string> {
  return regenerateText(
    selection,
    `Shift the tone of this section to be more ${targetTone}. Maintain the core story beats but adjust language, pacing, and imagery.`
  )
}

// Format script content for display
export function formatScreenplay(text: string): string {
  if (!text) return ''

  let formatted = text

  // Normalize line breaks
  formatted = formatted.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Scene headings (INT./EXT.)
  formatted = formatted.replace(
    /^(INT\.|EXT\.|INT\/EXT\.)(.+?)(?:\n|$)/gm,
    '<div class="scene-heading">$1$2</div>\n'
  )

  // Character names (ALL CAPS on their own line, before dialogue)
  formatted = formatted.replace(
    /^([A-Z][A-Z\s]+)(?:\s*\(([^)]+)\))?\s*$/gm,
    (match, name, parenthetical) => {
      if (parenthetical) {
        return `<div class="character-name">${name}<span class="parenthetical">(${parenthetical})</span></div>`
      }
      return `<div class="character-name">${name}</div>`
    }
  )

  // Standalone parentheticals
  formatted = formatted.replace(/^\(([^)]+)\)$/gm, '<div class="parenthetical">($1)</div>')

  // Wrap remaining paragraphs as action
  formatted = formatted
    .split('\n\n')
    .map(para => {
      if (para.includes('class="')) return para
      return `<p class="action">${para}</p>`
    })
    .join('\n')

  return formatted
}

// Parse screenplay back to plain text
export function parseScreenplayToText(html: string): string {
  if (typeof document === 'undefined') {
    // Fallback for SSR - simple strip tags
    return html.replace(/<[^>]*>/g, '')
  }
  const div = document.createElement('div')
  div.innerHTML = html
  return div.innerText || div.textContent || ''
}
