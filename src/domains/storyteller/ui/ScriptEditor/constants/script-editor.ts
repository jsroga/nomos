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

export enum ScriptEditorSurfaceClass {
  Frame = 'relative mx-auto min-h-full',
  NovelWidth = 'max-w-[65ch]',
  ScriptWidth = 'max-w-[72ch]',
  Editor = 'script-editor px-16 py-12 outline-none min-h-full',
}

/** Float above the episode header (z-40) and global chrome (z-100). */
export enum ScriptEditorSelectionMenuClass {
  Backdrop = 'fixed inset-0 z-[199]',
  Menu = 'fixed z-[200] bg-card border border-border rounded-lg shadow-xl p-2 space-y-1',
}

export const SCRIPT_EDITOR_INK = '#e0e0e0'

export const SCRIPT_EDITOR_NOVEL_TYPE = {
  fontFamily: 'Georgia, "Times New Roman", Times, serif',
  fontSize: '18px',
  lineHeight: '1.85',
  color: SCRIPT_EDITOR_INK,
  whiteSpace: 'pre-wrap',
} as const

export const SCRIPT_EDITOR_SCRIPT_TYPE = {
  fontFamily: '"Courier Prime", "Courier New", Courier, monospace',
  fontSize: '14px',
  lineHeight: '1.6',
  color: SCRIPT_EDITOR_INK,
  whiteSpace: 'pre-wrap',
} as const

export interface ScriptEditorSelectionContext {
  beforeText?: string
  afterText?: string
}
