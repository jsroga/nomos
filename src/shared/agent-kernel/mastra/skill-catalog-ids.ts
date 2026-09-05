/**
 * Catalog L2 skill ids from target-architecture §6.
 * Resolver and registry consume these; bodies stay on disk under mastra agents.
 */
export enum SkillCatalogId {
  Planning = 'planning',
  SceneCausalityAndAgency = 'scene-causality-and-agency',
  RevisionChecklist = 'revision-checklist',
  StyleFidelity = 'style-fidelity',
  CognitionLayersAndLanguage = 'cognition-layers-and-language',
  DialogueAndBehavior = 'dialogue-and-behavior',
  StoryOutlineAndCausalSummary = 'story-outline-and-causal-summary',
  CharacterIntroductions = 'character-introductions',
  SceneAndStructure = 'scene-and-structure',
  RealismConstraints = 'realism-constraints',
  ManuscriptScript = 'manuscript-script',
  ManuscriptNovel = 'manuscript-novel',
}

/** Draft format skill — resolver loads exactly one of these bodies. */
export enum SkillManuscriptFormat {
  Script = 'script',
  Novel = 'novel',
}

/** Hard-rule citation ids (Action 15) — appear in matchers / gate enums. */
export enum SkillHardRuleId {
  NakedCharacterEntry = 'naked-character-entry',
  AccessLimits = 'access-limits',
  EmbodiedDialogue = 'embodied-dialogue',
  StyleProtection = 'style-protection',
  ProjectRulesOverride = 'project-rules-override',
}

export enum SkillCatalogLevel {
  L1 = 'L1',
  L2 = 'L2',
}

export enum SkillCatalogStage {
  Plan = 'plan',
  Draft = 'draft',
  Critique = 'critique',
  Revise = 'revise',
  Humanize = 'humanize',
}
