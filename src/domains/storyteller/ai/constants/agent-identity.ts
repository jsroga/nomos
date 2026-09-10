export enum StorytellerAgentSpan {
  Run = 'StorytellerAgent.run',
  GenerateBeat = 'StorytellerAgent.generateBeat',
  CheckStoryContinuity = 'StorytellerAgent.checkStoryContinuity',
  AnalyzeCharacterDynamics = 'StorytellerAgent.analyzeCharacterDynamics',
}

export enum BeatPlannerAgentSpan {
  PlanNextBeat = 'BeatPlannerAgent.planNextBeat',
  Run = 'BeatPlannerAgent.run',
}

export enum StorytellerAgentId {
  Chat = 'chat',
  Storyteller = 'storyteller',
}

export enum StorytellerAgentLabel {
  Storyteller = 'Storyteller',
}

export enum StorytellerAgentDescription {
  Storyteller =
    'Storyteller · Chat adapter: bible tools and converse. Beat draft goes through the workflow.',
}

export enum BeatPlannerAgentId {
  BeatPlanner = 'beat-planner',
}

export enum BeatPlannerAgentLabel {
  BeatPlanner = 'Beat Planner',
}

export enum AgentModelRole {
  Author = 'author',
  Chat = 'chat',
  Planner = 'planner',
  Muse = 'muse',
  Auto = 'auto',
}

export enum GrrmAuthorAgentId {
  GrrmAuthor = 'grrm-author',
}

export enum GrrmAuthorAgentLabel {
  GrrmAuthor = 'GRRM Author',
}

export enum GrrmAuthorAgentDescription {
  GrrmAuthor = 'Storyteller · Drafts script beats from a plan.',
  BeatPlanner = 'Storyteller · Plans beat structure: goal, conflict, turn, dialogue hook.',
}

export enum GrrmAuthorAgentSpan {
  Run = 'GrrmAuthorAgent.run',
  GenerateBeat = 'GrrmAuthorAgent.generateBeat',
}

export enum GrrmAuthorCopy {
  OpeningBeat = 'This is the opening beat.',
  GenerateScriptBeat = 'Generate script beat',
}

export enum ListSeparator {
  CommaSpace = ', ',
}

export enum StorytellerSystemPromptId {
  StorytellerSystem = 'storyteller-system',
}

export enum BeatPlannerCopy {
  OpeningBeat = 'This is the opening beat.',
  GenerateStoryBeat = 'Generate story beat',
  CheckStoryContinuity = 'Check story continuity',
  AnalyzeCharacterDynamics = 'Analyze character dynamics',
}
