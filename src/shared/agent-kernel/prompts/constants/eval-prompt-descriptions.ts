/** One-line catalog copy for registered judge prompts. Not the rubric body. */

export enum EvalPromptDescription {
  ToolUsage = 'Score whether a tool call matched schema, ran, and matched the expected result.',
  Correction = 'Score whether a revision addressed the critique and improved the draft.',
  Orchestration = 'Score whether the agent sequenced tools toward the requested goal.',
  Eq = 'Score predicted character emotion at the end of a scene.',
  Toxicity = 'Score toxic language in generated content.',
  Manipulation = 'Score manipulation patterns in dialogue.',
  ScriptFormat = 'Score screenplay format adherence.',
  Dialogue = 'Score dialogue craft in a script excerpt.',
  Pacing = 'Score scene pacing.',
  Magic = 'Holistic creative quality 0–100: originality, voice, subtext, anti-slop.',
  Retrieval = 'Score retrieved-document relevance to a query.',
  Persona = 'Score how well prose matches a requested creative persona.',
  ReverseIntent = 'Score whether output fulfills the inferred user intent.',
  Hallucination = 'Score grounding against established canon; 1 means no fabrication.',
  Citation = 'Score whether citations exist and support the claims.',
  RagGrounding = 'Score whether output is grounded in the supplied reference documents.',
}

export const EVAL_PROMPT_DESCRIPTIONS: Record<string, string> = {
  'tool-usage-judge': EvalPromptDescription.ToolUsage,
  'correction-judge': EvalPromptDescription.Correction,
  'orchestration-judge': EvalPromptDescription.Orchestration,
  'eq-judge': EvalPromptDescription.Eq,
  'toxicity-judge': EvalPromptDescription.Toxicity,
  'manipulation-judge': EvalPromptDescription.Manipulation,
  'script-format-judge': EvalPromptDescription.ScriptFormat,
  'dialogue-judge': EvalPromptDescription.Dialogue,
  'pacing-judge': EvalPromptDescription.Pacing,
  'magic-judge': EvalPromptDescription.Magic,
  'retrieval-judge': EvalPromptDescription.Retrieval,
  'persona-fidelity-judge': EvalPromptDescription.Persona,
  'reverse-intent-judge': EvalPromptDescription.ReverseIntent,
  'hallucination-judge': EvalPromptDescription.Hallucination,
  'citation-judge': EvalPromptDescription.Citation,
  'rag-grounding-judge': EvalPromptDescription.RagGrounding,
}
