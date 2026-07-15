/**
 * Script Edit Operations
 *
 * Handles AI-powered script editing operations similar to how Cursor edits code.
 */

import { createStorytellerAgent } from '@/domains/storyteller/agents'
import {
  SCRIPT_CONDENSE_INSTRUCTION,
  SCRIPT_EDIT_PROMPT_LABEL,
  SCRIPT_EXPAND_INSTRUCTION,
  SCRIPT_REGENERATION_FAILED_LOG,
  SCRIPT_VISUAL_HOOK_INSTRUCTION,
} from '@/domains/storyteller/services/constants/script-operations'

// ... existing code ...

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

const CONTEXT_LIMIT = 5000

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
Before: "${context.beforeText?.slice(-CONTEXT_LIMIT) || ''}"
After: "${context.afterText?.slice(0, CONTEXT_LIMIT) || ''}"

${
  context.characterVoices
    ? `CHARACTER VOICES:\n${Object.entries(context.characterVoices)
        .map(([name, voice]) => `- ${name}: ${voice}`)
        .join('\n')}`
    : ''
}
`
    : ''

  try {
    const agent = await createStorytellerAgent()
    const result = await agent.run(
      SCRIPT_EDIT_PROMPT_LABEL,
      `${SCRIPT_EDITOR_PROMPT}\n\n${contextInfo}\n\nSELECTED TEXT TO EDIT:\n"""\n${selection}\n"""\n\nINSTRUCTION: ${instruction}\n\nReturn only the edited text:`
    )
    return result.trim()
  } catch (error) {
    console.error(SCRIPT_REGENERATION_FAILED_LOG, error)
    throw error
  }
}

export async function expandScene(
  selection: string,
  context?: { beforeText?: string; afterText?: string }
): Promise<string> {
  return regenerateText(
    selection,
    SCRIPT_EXPAND_INSTRUCTION,
    context
  )
}

export async function condenseScene(
  selection: string,
  context?: { beforeText?: string; afterText?: string }
): Promise<string> {
  return regenerateText(
    selection,
    SCRIPT_CONDENSE_INSTRUCTION,
    context
  )
}

export async function improveDialogue(
  selection: string,
  characterName: string,
  voiceNotes?: string,
  context?: { beforeText?: string; afterText?: string }
): Promise<string> {
  return regenerateText(
    selection,
    `Improve this dialogue for ${characterName}. ${voiceNotes ? `Voice notes: ${voiceNotes}.` : ''} Make it more natural, add subtext, and ensure it reveals character while advancing the scene.`,
    context
  )
}

export async function addVisualHook(
  selection: string,
  context?: { beforeText?: string; afterText?: string }
): Promise<string> {
  return regenerateText(
    selection,
    SCRIPT_VISUAL_HOOK_INSTRUCTION,
    context
  )
}

export async function shiftTone(
  selection: string,
  targetTone: string,
  context?: { beforeText?: string; afterText?: string }
): Promise<string> {
  return regenerateText(
    selection,
    `Shift the tone of this section to be more ${targetTone}. Maintain the core story beats but adjust language, pacing, and imagery.`,
    context
  )
}
