/**
 * @deprecated Import from `src/mastra/agents/grrm-author/compose-instructions`.
 * Thin re-export so existing callers keep compiling during migration.
 */

export {
  composeGrrmInstructions as buildGrrmSystemPrompt,
  composeGrrmInstructionsCompact as buildGrrmSystemPromptCompact,
} from '../../../../mastra/agents/grrm-author/compose-instructions'
