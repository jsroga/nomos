/** Stable Studio overlay ids for briefs (`brief-*`) and registry prompts (`registry-*`). */

export enum PromptBlockPrefix {
  Brief = 'brief-',
  Registry = 'registry-',
}

/** PromptRepository / getPrompt names that have Studio overlay ids. */
export enum PromptRegistryName {
  MagicJudge = 'magic-judge',
  HallucinationJudge = 'hallucination-judge',
  PersonaFidelityJudge = 'persona-fidelity-judge',
  GameDesignSystem = 'game-design-system',
  GameDesignLoop = 'game-design-loop',
  BalanceAnalysis = 'balance-analysis-prompt',
}

export enum PromptBlockId {
  BriefStoryteller = 'brief-storyteller',
  BriefGrrmAuthor = 'brief-grrm-author',
  BriefBeatPlanner = 'brief-beat-planner',
  BriefContinuity = 'brief-continuity-critic',
  BriefProse = 'brief-prose-critic',
  BriefStakes = 'brief-stakes-critic',
  BriefDialogue = 'brief-dialogue-critic',
  BriefMuse = 'brief-muse',
  BriefMuseRanker = 'brief-muse-ranker',
  BriefAutonomous = 'brief-storyteller-autonomous-author',
  RegistryMagicJudge = 'registry-magic-judge',
  RegistryHallucinationJudge = 'registry-hallucination-judge',
  RegistryPersonaFidelityJudge = 'registry-persona-fidelity-judge',
  RegistryGameDesignSystem = 'registry-game-design-system',
  RegistryGameDesignLoop = 'registry-game-design-loop',
  RegistryBalanceAnalysis = 'registry-balance-analysis-prompt',
}
