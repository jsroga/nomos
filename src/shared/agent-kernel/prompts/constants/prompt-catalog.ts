/** Domain label in Studio Prompts Description and Agent Purpose. */
export enum PromptCatalogDomain {
  Storyteller = 'Storyteller',
  GameDesign = 'Game Design',
  LoopCreator = 'Loop Creator',
  Eval = 'Eval',
  Shared = 'Shared',
  Studio = 'Studio',
}

export enum PromptCatalogTag {
  Evaluation = 'evaluation',
  GameDesign = 'game-design',
}

export enum PromptCatalogJoin {
  Domain = ' · ',
}

/** Heading for the live tool-id contract appended to Studio/Open Chat instructions. */
export enum PromptSectionHeading {
  AvailableTools = '## Available Tools',
}

export enum FileAgentCatalogId {
  Storyteller = 'storyteller',
  GrrmAuthor = 'grrm-author',
  BeatPlanner = 'beat-planner',
  Continuity = 'continuity-critic',
  Prose = 'prose-critic',
  Stakes = 'stakes-critic',
  Dialogue = 'dialogue-critic',
  Muse = 'muse',
  MuseRanker = 'muse-ranker',
  Autonomous = 'storyteller-autonomous-author',
}

export enum FileAgentCatalogBody {
  Storyteller = 'Chat adapter: bible tools and converse. Beat draft goes through the workflow.',
  GrrmAuthor = 'Drafts script beats from a plan.',
  BeatPlanner = 'Plans beat structure: goal, conflict, turn, dialogue hook.',
  Continuity = 'Finds knowledge, timeline, and canon contradictions.',
  Prose = 'Finds stated emotion, clichés, POV breaks, and flattened voice.',
  Stakes = 'Finds costless beats, unearned victories, and slack tension.',
  Dialogue = 'Finds talking-heads and disembodied said-book speech.',
  Muse = 'Blank-context wild ideas with irreversible on-screen action.',
  MuseRanker = 'Keep/reject muse ideas on motion, surprise, fit, and cost.',
  Autonomous = 'Long-running author toward a standing objective.',
  Fallback = 'File-based agent brief from instructions.md.',
}

export enum StudioPurposeBody {
  QualityImprover = 'Hour-bot for live writer experiments and Editor drafts.',
}

export enum LoopCreatorPurposeBody {
  Supervisor = 'Routes loop-creation crew work.',
  LoopPlanner = 'Plans core, meta, and social loops.',
  MechanicsDesigner = 'Designs balanced, well-defined mechanics.',
  BalanceAnalyst = 'Evaluates effort, reward, and loop integrity.',
  ProgressionArchitect = 'Designs pacing and progression systems.',
  ConceptEvaluator = 'Scores fit against the stated concept.',
  MarketAnalyst = 'Scores market fit for a designed loop.',
}

export enum LoopCreatorPurposeSuffix {
  InternalNotStudio = ' Internal; not Studio chat.',
}

export enum GameDesignPromptDescription {
  System = 'Senior loop, economy, and progression designer with project tools.',
  Loop = 'Next-action prompt for the current game-design goal and context.',
  Balance = 'Balance review of a loop: rewards, grind, dead ends, resources.',
}
