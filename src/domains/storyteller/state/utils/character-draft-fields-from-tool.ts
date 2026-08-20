import { recordFromJson } from '@/shared/data/json-guards'
import {
  generatedCharacterFieldsFromUnknown,
  type GeneratedCharacterFields,
} from '@/domains/storyteller/core/character-missing-fields'
import { StorytellerChatTool } from '@/domains/storyteller/core/storyteller-page-wire'
import type { AssistantCompletedToolCall } from '@/shared/chat/assistant/extract-completed-assistant-tool-calls'

export function characterDraftFieldsFromUnknown(value: unknown): GeneratedCharacterFields | null {
  const fields = generatedCharacterFieldsFromUnknown(value)
  return Object.keys(fields).length > 0 ? fields : null
}

export function characterDraftFieldsFromToolArgs(
  toolArgs: readonly Record<string, unknown>[],
): GeneratedCharacterFields | null {
  for (const args of toolArgs) {
    const fields = characterDraftFieldsFromUnknown(args)
    if (fields) return fields
  }
  return null
}

export function isCharacterDraftToolArgs(
  _toolArgs: readonly Record<string, unknown>[],
  toolNames: readonly string[] = [],
): boolean {
  return toolNames.some(name => name === StorytellerChatTool.ProposeCharacterFields)
}

export function characterDraftFieldsFromToolCall(
  call: AssistantCompletedToolCall,
): GeneratedCharacterFields | null {
  if (call.toolName !== StorytellerChatTool.ProposeCharacterFields) return null
  const result = recordFromJson(call.result)
  return (
    characterDraftFieldsFromUnknown(result.fields ?? result) ??
    characterDraftFieldsFromUnknown(call.args)
  )
}
