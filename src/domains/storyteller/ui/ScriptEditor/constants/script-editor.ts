export enum ScriptRegenerateAction {
  Expand = 'expand',
  Condense = 'condense',
  Rewrite = 'rewrite',
  Custom = 'custom',
}

export enum ScriptEditorCommand {
  InsertText = 'insertText',
}

export const SCRIPT_EDITOR_EXPAND_PROMPT =
  'Expand this section with more detail and sensory description'

export const SCRIPT_EDITOR_CONDENSE_PROMPT =
  'Condense this to be more concise while keeping the essence'

export const SCRIPT_EDITOR_REWRITE_PROMPT =
  'Rewrite this in a different way, maintaining the same meaning'

export const SCRIPT_EDITOR_REGENERATION_FAILED_LOG = 'Regeneration failed:'
