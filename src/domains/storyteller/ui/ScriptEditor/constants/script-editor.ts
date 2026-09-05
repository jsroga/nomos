import { lookupPromptBody } from '@/domains/storyteller/ai/prompts/registry/prompt-registry-table'
import { StorytellerPromptRegistryId } from '@/domains/storyteller/ai/prompts/registry/prompt-registry-ids'

export enum ScriptRegenerateAction {
  Expand = 'expand',
  Condense = 'condense',
  Rewrite = 'rewrite',
  Custom = 'custom',
}

export enum ScriptEditorCommand {
  InsertText = 'insertText',
}

export const SCRIPT_EDITOR_EXPAND_PROMPT = lookupPromptBody(
  StorytellerPromptRegistryId.ScriptEditorExpand
)

export const SCRIPT_EDITOR_CONDENSE_PROMPT = lookupPromptBody(
  StorytellerPromptRegistryId.ScriptEditorCondense
)

export const SCRIPT_EDITOR_REWRITE_PROMPT = lookupPromptBody(
  StorytellerPromptRegistryId.ScriptEditorRewrite
)

export const SCRIPT_EDITOR_REGENERATION_FAILED_LOG = 'Regeneration failed:'

export interface ScriptEditorSelectionContext {
  beforeText?: string
  afterText?: string
}
