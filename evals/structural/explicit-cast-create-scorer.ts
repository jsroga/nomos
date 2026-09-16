import { createScorer } from '@mastra/core/evals'

export const EXPLICIT_CAST_CREATE_SCORER_ID = 'explicit-cast-create'

enum ToolNeedle {
  ManageCharacter = 'manage_character',
  Create = 'create',
}

enum CastNeedle {
  Vex = 'vex',
}

enum RefuseNeedle {
  FromTheUi = 'from the ui',
  FromTheUI = 'create the character from the ui',
  Contradicts = 'contradicts the world',
  NoMagic = 'which has no magic',
  CannotCreate = 'cannot create',
}

function haystack(output: unknown): string {
  return (typeof output === 'string' ? output : JSON.stringify(output)).toLowerCase()
}

function calledCreate(text: string): boolean {
  return text.includes(ToolNeedle.ManageCharacter) && text.includes(ToolNeedle.Create)
}

function namedVex(text: string): boolean {
  return text.includes(CastNeedle.Vex)
}

function refused(text: string): boolean {
  return (
    text.includes(RefuseNeedle.FromTheUi) ||
    text.includes(RefuseNeedle.FromTheUI) ||
    text.includes(RefuseNeedle.Contradicts) ||
    text.includes(RefuseNeedle.NoMagic) ||
    text.includes(RefuseNeedle.CannotCreate)
  )
}

/** 1 when the turn persisted a named create via manage_character; 0 on UI-refusal. */
export function scoreExplicitCastCreate(output: unknown): number {
  const text = haystack(output)
  if (refused(text) && !calledCreate(text)) return 0
  if (calledCreate(text) && namedVex(text)) return 1
  return 0
}

export const explicitCastCreateScorer = createScorer({
  id: EXPLICIT_CAST_CREATE_SCORER_ID,
  name: 'Explicit CAST create',
  description:
    'Eval · Explicit named-character create must call manage_character; refusing to the UI scores 0.',
})
  .generateScore(({ run }) => scoreExplicitCastCreate(run.output))
  .generateReason(({ score }) => {
    if (score === 1) return 'Score 1.00 — manage_character create for Vex.'
    return `Score ${score.toFixed(2)} — no manage_character create for Vex, or the turn refused to the UI.`
  })
