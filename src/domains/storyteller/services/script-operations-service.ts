/**
 * Script Edit Operations
 *
 * Handles AI-powered script editing operations similar to how Cursor edits code.
 */

import { lookupPromptBody } from '@/domains/storyteller/ai/prompts/registry/prompt-registry-table'
import { StorytellerPromptRegistryId } from '@/domains/storyteller/ai/prompts/registry/prompt-registry-ids'
import {
  SCRIPT_CONDENSE_INSTRUCTION,
  SCRIPT_EXPAND_INSTRUCTION,
  SCRIPT_REGENERATION_FAILED_LOG,
  SCRIPT_VISUAL_HOOK_INSTRUCTION,
} from '@/domains/storyteller/services/constants/script-operations'
import { TEXT_GEN_FAST_MODEL } from '@/shared/agent-kernel/models'
import { complete } from '@/shared/ai/gateway'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import type { ProjectScope } from '@/shared/auth/project-scope'

const SCRIPT_EDITOR_PROMPT = lookupPromptBody(StorytellerPromptRegistryId.ScriptEditorSystem)

const CONTEXT_LIMIT = 5000

export async function regenerateText(
  scope: ProjectScope,
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
    const result = await complete({
      scope,
      feature: LlmFeature.StorytellerScriptEdit,
      model: TEXT_GEN_FAST_MODEL,
      system: SCRIPT_EDITOR_PROMPT,
      prompt: `${contextInfo}\n\nSELECTED TEXT TO EDIT:\n"""\n${selection}\n"""\n\nINSTRUCTION: ${instruction}\n\nReturn only the edited text:`,
    })
    return result.text.trim()
  } catch (error) {
    console.error(SCRIPT_REGENERATION_FAILED_LOG, error)
    throw error
  }
}

export async function expandScene(
  scope: ProjectScope,
  selection: string,
  context?: { beforeText?: string; afterText?: string }
): Promise<string> {
  return regenerateText(scope, selection, SCRIPT_EXPAND_INSTRUCTION, context)
}

export async function condenseScene(
  scope: ProjectScope,
  selection: string,
  context?: { beforeText?: string; afterText?: string }
): Promise<string> {
  return regenerateText(scope, selection, SCRIPT_CONDENSE_INSTRUCTION, context)
}

export async function improveDialogue(
  scope: ProjectScope,
  selection: string,
  characterName: string,
  voiceNotes?: string,
  context?: { beforeText?: string; afterText?: string }
): Promise<string> {
  return regenerateText(
    scope,
    selection,
    `Improve this dialogue for ${characterName}. ${voiceNotes ? `Voice notes: ${voiceNotes}.` : ''} Make it more natural, add subtext, and ensure it reveals character while advancing the scene.`,
    context
  )
}

export async function addVisualHook(
  scope: ProjectScope,
  selection: string,
  context?: { beforeText?: string; afterText?: string }
): Promise<string> {
  return regenerateText(scope, selection, SCRIPT_VISUAL_HOOK_INSTRUCTION, context)
}

export async function shiftTone(
  scope: ProjectScope,
  selection: string,
  targetTone: string,
  context?: { beforeText?: string; afterText?: string }
): Promise<string> {
  return regenerateText(
    scope,
    selection,
    `Shift the tone of this section to be more ${targetTone}. Maintain the core story beats but adjust language, pacing, and imagery.`,
    context
  )
}
