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
  Auto = 'auto',
}

export enum GrrmAuthorAgentId {
  GrrmAuthor = 'grrm-author',
}

export enum GrrmAuthorAgentLabel {
  GrrmAuthor = 'GRRM Author',
}

export enum GrrmAuthorAgentDescription {
  GrrmAuthor =
    'The solo creative mind — drafts and revises script beats with craft mechanics (Law of Motion, anti-slop, subtext dialogue).',
  BeatPlanner =
    'Plans beat structure as JSON (goal, conflict, turn, dialogue hook) — never writes prose.',
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
