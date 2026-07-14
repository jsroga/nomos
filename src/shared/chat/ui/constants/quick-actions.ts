/** QuickActions id/label/variant/prompt tables. */

export enum QuickActionVariant {
  Default = 'default',
  Primary = 'primary',
  Subtle = 'subtle',
}

export enum QuickActionId {
  Regenerate = 'regenerate',
  Continue = 'continue',
  GenerateBeats = 'generate-beats',
  EditPremise = 'edit-premise',
  AddSoundtrack = 'add-soundtrack',
  WriteScript = 'write-script',
  AddBeat = 'add-beat',
  CreateCharacter = 'create-character',
  AddRule = 'add-rule',
  GenerateEpisodes = 'generate-episodes',
  AskQuestion = 'ask-question',
  SuggestIdea = 'suggest-idea',
  ProposeNext = 'propose-next',
  GeneratePremise = 'generate-premise',
  SuggestTheme = 'suggest-theme',
  AddTwist = 'add-twist',
  WriteScene = 'write-scene',
  ImproveDialogue = 'improve-dialogue',
  CreateFaction = 'create-faction',
  GenerateRoadmap = 'generate-roadmap',
  DesignMechanics = 'design-mechanics',
  GenerateLoop = 'generate-loop',
  AnalyzeBalance = 'analyze-balance',
  AddProgression = 'add-progression',
  MarketAnalysis = 'market-analysis',
  Ask = 'ask',
}

export enum QuickActionLabel {
  Regenerate = 'Regenerate',
  Continue = 'Continue',
  GenerateBeats = 'Generate Beats',
  EditPremise = 'Edit Premise',
  AddSoundtrack = 'Add Soundtrack',
  WriteScript = 'Write Script',
  AddBeat = 'Add Beat',
  CreateCharacter = 'Create Character',
  AddWorldRule = 'Add World Rule',
  GenerateEpisodes = 'Generate Episodes',
  AskQuestion = 'Ask a question',
  SuggestIdea = 'Suggest an idea',
  ProposeNextStep = 'Propose next step',
  GeneratePremise = 'Generate Premise',
  SuggestTheme = 'Suggest Theme',
  GenerateStoryBeats = 'Generate Story Beats',
  AddPlotTwist = 'Add Plot Twist',
  WriteNextScene = 'Write Next Scene',
  ImproveDialogue = 'Improve Dialogue',
  CreateFaction = 'Create Faction',
  GenerateSeasonRoadmap = 'Generate Season Roadmap',
  DesignCoreMechanics = 'Design Core Mechanics',
  GenerateLoopNodes = 'Generate Loop Nodes',
  AnalyzeBalance = 'Analyze Balance',
  AddProgression = 'Add Progression',
  MarketAnalysis = 'Market Analysis',
}

export enum SmartQuickActionPhase {
  Premise = 'premise',
  Breaking = 'breaking',
  Writing = 'writing',
  WorldBuilding = 'world_building',
  LoopDesign = 'loop_design',
  Complete = 'complete',
}

export enum SmartQuickActionPrompt {
  ProposeNextStep = 'Propose the next logical step for this story.',
  GeneratePremise = 'Generate an episode premise using the Ozymandias framework.',
  SuggestTheme = 'Suggest some thematic ideas for this episode.',
  GenerateStoryBeats = 'Break this premise into detailed story beats.',
  AddPlotTwist = 'Suggest a surprising plot twist for this story.',
  WriteNextScene = 'Write the next scene in the script.',
  ImproveDialogue = 'Help me improve the dialogue in the current scene.',
  CreateFaction = 'Create a new faction for this world.',
  AddWorldRule = 'Add a new rule or constraint to this world.',
  GenerateSeasonRoadmap = 'Generate an episode roadmap for the season.',
  DesignCoreMechanics =
    'Design the core mechanics for this game loop. Focus on genre-defining innovation.',
  GenerateLoopNodes = 'Generate game loop nodes based on my game concept.',
  AnalyzeBalance = 'Analyze the balance of effort vs reward in my current game loop.',
  AddProgression = 'Design a progression system for this game loop.',
  MarketAnalysis = 'Run a market analysis for this game concept.',
}

export interface QuickActionTemplate {
  id: QuickActionId
  label: QuickActionLabel
  variant?: QuickActionVariant
  prompt?: SmartQuickActionPrompt
}

export const QUICK_ACTION_AFTER_GENERATION: QuickActionTemplate[] = [
  { id: QuickActionId.Regenerate, label: QuickActionLabel.Regenerate },
  {
    id: QuickActionId.Continue,
    label: QuickActionLabel.Continue,
    variant: QuickActionVariant.Primary,
  },
]

export const QUICK_ACTION_AFTER_PREMISE_TEMPLATES: QuickActionTemplate[] = [
  {
    id: QuickActionId.GenerateBeats,
    label: QuickActionLabel.GenerateBeats,
    variant: QuickActionVariant.Primary,
  },
  { id: QuickActionId.EditPremise, label: QuickActionLabel.EditPremise },
  { id: QuickActionId.AddSoundtrack, label: QuickActionLabel.AddSoundtrack },
]

export const QUICK_ACTION_AFTER_BEATS_TEMPLATES: QuickActionTemplate[] = [
  {
    id: QuickActionId.WriteScript,
    label: QuickActionLabel.WriteScript,
    variant: QuickActionVariant.Primary,
  },
  { id: QuickActionId.AddBeat, label: QuickActionLabel.AddBeat },
]

export const QUICK_ACTION_AFTER_WORLD_BUILDING_TEMPLATES: QuickActionTemplate[] = [
  { id: QuickActionId.CreateCharacter, label: QuickActionLabel.CreateCharacter },
  { id: QuickActionId.AddRule, label: QuickActionLabel.AddWorldRule },
  {
    id: QuickActionId.GenerateEpisodes,
    label: QuickActionLabel.GenerateEpisodes,
    variant: QuickActionVariant.Primary,
  },
]

export const QUICK_ACTION_GENERIC_TEMPLATES: QuickActionTemplate[] = [
  { id: QuickActionId.AskQuestion, label: QuickActionLabel.AskQuestion },
  { id: QuickActionId.SuggestIdea, label: QuickActionLabel.SuggestIdea },
]

export const SMART_QUICK_ACTION_PREMISE: QuickActionTemplate[] = [
  { id: QuickActionId.GeneratePremise, label: QuickActionLabel.GeneratePremise, prompt: SmartQuickActionPrompt.GeneratePremise },
  { id: QuickActionId.SuggestTheme, label: QuickActionLabel.SuggestTheme, prompt: SmartQuickActionPrompt.SuggestTheme },
]

export const SMART_QUICK_ACTION_BREAKING: QuickActionTemplate[] = [
  { id: QuickActionId.GenerateBeats, label: QuickActionLabel.GenerateStoryBeats, prompt: SmartQuickActionPrompt.GenerateStoryBeats },
  { id: QuickActionId.AddTwist, label: QuickActionLabel.AddPlotTwist, prompt: SmartQuickActionPrompt.AddPlotTwist },
]

export const SMART_QUICK_ACTION_WRITING: QuickActionTemplate[] = [
  { id: QuickActionId.WriteScene, label: QuickActionLabel.WriteNextScene, prompt: SmartQuickActionPrompt.WriteNextScene },
  { id: QuickActionId.ImproveDialogue, label: QuickActionLabel.ImproveDialogue, prompt: SmartQuickActionPrompt.ImproveDialogue },
]

export const SMART_QUICK_ACTION_WORLD_BUILDING: QuickActionTemplate[] = [
  { id: QuickActionId.CreateFaction, label: QuickActionLabel.CreateFaction, prompt: SmartQuickActionPrompt.CreateFaction },
  { id: QuickActionId.AddRule, label: QuickActionLabel.AddWorldRule, prompt: SmartQuickActionPrompt.AddWorldRule },
  { id: QuickActionId.GenerateRoadmap, label: QuickActionLabel.GenerateSeasonRoadmap, prompt: SmartQuickActionPrompt.GenerateSeasonRoadmap },
]

export const SMART_QUICK_ACTION_LOOP_DESIGN: QuickActionTemplate[] = [
  { id: QuickActionId.DesignMechanics, label: QuickActionLabel.DesignCoreMechanics, prompt: SmartQuickActionPrompt.DesignCoreMechanics },
  { id: QuickActionId.GenerateLoop, label: QuickActionLabel.GenerateLoopNodes, prompt: SmartQuickActionPrompt.GenerateLoopNodes },
  { id: QuickActionId.AnalyzeBalance, label: QuickActionLabel.AnalyzeBalance, prompt: SmartQuickActionPrompt.AnalyzeBalance },
  { id: QuickActionId.AddProgression, label: QuickActionLabel.AddProgression, prompt: SmartQuickActionPrompt.AddProgression },
  { id: QuickActionId.MarketAnalysis, label: QuickActionLabel.MarketAnalysis, prompt: SmartQuickActionPrompt.MarketAnalysis },
]

export const SMART_QUICK_ACTION_DEFAULT: QuickActionTemplate[] = [
  { id: QuickActionId.Ask, label: QuickActionLabel.AskQuestion },
]

export const SMART_QUICK_ACTION_PROPOSE_TEMPLATE: QuickActionTemplate = {
  id: QuickActionId.ProposeNext,
  label: QuickActionLabel.ProposeNextStep,
  prompt: SmartQuickActionPrompt.ProposeNextStep,
}
