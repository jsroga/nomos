import {
  SkillCatalogId,
  SkillCatalogStage,
  SkillHardRuleId,
} from '@/shared/agent-kernel/mastra/skill-catalog-ids'

export enum SkillCatalogOwner {
  Planner = 'planner',
  Author = 'author',
  Critic = 'critic',
  Humanizer = 'humanizer',
}

export enum SkillCatalogProblemMatch {
  Causality = 'causality',
  Agency = 'agency',
  StyleFidelitySnake = 'style_fidelity',
  StyleFidelityPascal = 'StyleFidelity',
  Cognition = 'cognition',
  Pov = 'pov',
  Dialogue = 'dialogue',
  Continuity = 'continuity',
  CharacterIntroductionSnake = 'character_introduction',
  CharacterIntroductionPascal = 'CharacterIntroduction',
  Structure = 'structure',
  Realism = 'realism',
  FakeMatchToken = 'fake-match-token',
}

export enum SkillCatalogDescription {
  Planning = 'Beat planning: concrete action, stakes, and causal next step.',
  SceneCausalityAndAgency = 'Scene causality and character agency — who chooses, what changes.',
  RevisionChecklist = 'Revision checklist after critique — fix listed problems only.',
  StyleFidelity = 'Style fidelity on revise diffs — voice match without new plot.',
  CognitionLayersAndLanguage = 'Cognition layers and language — access limits for POV.',
  DialogueAndBehavior = 'Embodied dialogue and behavior — speech that does work.',
  StoryOutlineAndCausalSummary = 'Story outline and causal summary for continuity.',
  CharacterIntroductions = 'Character introductions — no naked entry without grounding.',
  SceneAndStructure = 'Scene and structure — beats that move space and time.',
  RealismConstraints = 'Realism constraints — physical and social limits hold.',
}

export enum SkillCatalogFs {
  RootDir = 'skill-catalog',
  SkillFile = 'SKILL.md',
}

export interface SkillCatalogMatch {
  readonly stages: readonly SkillCatalogStage[]
  readonly problemTypes: readonly SkillCatalogProblemMatch[]
  readonly hardRules: readonly SkillHardRuleId[]
}

export interface SkillCatalogRow {
  readonly id: SkillCatalogId
  readonly description: SkillCatalogDescription
  readonly owners: readonly SkillCatalogOwner[]
  readonly match: SkillCatalogMatch
}

/**
 * Data-only skill catalog. Adding a row must not require editing compose-instructions.
 * Bodies load from disk when the resolver returns L2 for an id.
 */
export const SKILL_CATALOG: readonly SkillCatalogRow[] = [
  {
    id: SkillCatalogId.Planning,
    description: SkillCatalogDescription.Planning,
    owners: [SkillCatalogOwner.Planner],
    match: {
      stages: [SkillCatalogStage.Plan],
      problemTypes: [],
      hardRules: [],
    },
  },
  {
    id: SkillCatalogId.SceneCausalityAndAgency,
    description: SkillCatalogDescription.SceneCausalityAndAgency,
    owners: [SkillCatalogOwner.Author, SkillCatalogOwner.Planner],
    match: {
      stages: [SkillCatalogStage.Plan, SkillCatalogStage.Draft, SkillCatalogStage.Revise],
      problemTypes: [SkillCatalogProblemMatch.Causality, SkillCatalogProblemMatch.Agency],
      hardRules: [],
    },
  },
  {
    id: SkillCatalogId.RevisionChecklist,
    description: SkillCatalogDescription.RevisionChecklist,
    owners: [SkillCatalogOwner.Author],
    match: {
      stages: [SkillCatalogStage.Revise],
      problemTypes: [],
      hardRules: [],
    },
  },
  {
    id: SkillCatalogId.StyleFidelity,
    description: SkillCatalogDescription.StyleFidelity,
    owners: [SkillCatalogOwner.Author, SkillCatalogOwner.Critic],
    match: {
      stages: [SkillCatalogStage.Revise, SkillCatalogStage.Critique],
      problemTypes: [
        SkillCatalogProblemMatch.StyleFidelitySnake,
        SkillCatalogProblemMatch.StyleFidelityPascal,
      ],
      hardRules: [SkillHardRuleId.StyleProtection],
    },
  },
  {
    id: SkillCatalogId.CognitionLayersAndLanguage,
    description: SkillCatalogDescription.CognitionLayersAndLanguage,
    owners: [SkillCatalogOwner.Author, SkillCatalogOwner.Critic],
    match: {
      stages: [SkillCatalogStage.Draft, SkillCatalogStage.Critique],
      problemTypes: [SkillCatalogProblemMatch.Cognition, SkillCatalogProblemMatch.Pov],
      hardRules: [SkillHardRuleId.AccessLimits],
    },
  },
  {
    id: SkillCatalogId.DialogueAndBehavior,
    description: SkillCatalogDescription.DialogueAndBehavior,
    owners: [SkillCatalogOwner.Author, SkillCatalogOwner.Critic],
    match: {
      stages: [SkillCatalogStage.Draft, SkillCatalogStage.Critique, SkillCatalogStage.Revise],
      problemTypes: [SkillCatalogProblemMatch.Dialogue],
      hardRules: [SkillHardRuleId.EmbodiedDialogue],
    },
  },
  {
    id: SkillCatalogId.StoryOutlineAndCausalSummary,
    description: SkillCatalogDescription.StoryOutlineAndCausalSummary,
    owners: [SkillCatalogOwner.Planner, SkillCatalogOwner.Critic],
    match: {
      stages: [SkillCatalogStage.Plan, SkillCatalogStage.Critique],
      problemTypes: [SkillCatalogProblemMatch.Continuity],
      hardRules: [SkillHardRuleId.ProjectRulesOverride],
    },
  },
  {
    id: SkillCatalogId.CharacterIntroductions,
    description: SkillCatalogDescription.CharacterIntroductions,
    owners: [SkillCatalogOwner.Author, SkillCatalogOwner.Planner],
    match: {
      stages: [SkillCatalogStage.Plan, SkillCatalogStage.Draft],
      problemTypes: [
        SkillCatalogProblemMatch.CharacterIntroductionSnake,
        SkillCatalogProblemMatch.CharacterIntroductionPascal,
      ],
      hardRules: [SkillHardRuleId.NakedCharacterEntry],
    },
  },
  {
    id: SkillCatalogId.SceneAndStructure,
    description: SkillCatalogDescription.SceneAndStructure,
    owners: [SkillCatalogOwner.Author, SkillCatalogOwner.Planner],
    match: {
      stages: [SkillCatalogStage.Plan, SkillCatalogStage.Draft],
      problemTypes: [SkillCatalogProblemMatch.Structure],
      hardRules: [],
    },
  },
  {
    id: SkillCatalogId.RealismConstraints,
    description: SkillCatalogDescription.RealismConstraints,
    owners: [SkillCatalogOwner.Author, SkillCatalogOwner.Critic],
    match: {
      stages: [SkillCatalogStage.Draft, SkillCatalogStage.Critique],
      problemTypes: [SkillCatalogProblemMatch.Realism],
      hardRules: [],
    },
  },
]
