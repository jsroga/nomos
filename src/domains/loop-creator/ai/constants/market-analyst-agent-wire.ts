/** Market analyst Mastra agent wire values and progress copy. */

export enum MarketAnalystAgentId {
  Id = 'market-analyst',
}

export enum MarketAnalystAgentName {
  Name = 'Market Analyst',
}

export const MARKET_ANALYST_AGENT_INSTRUCTIONS =
  'Perform comprehensive market research on game loops. Use tools to gather data, score archetypes, and produce a structured report.'

export enum MarketAnalystPromptPlaceholder {
  ScoringCriteria = '{{SCORING_CRITERIA}}',
  LoopContext = '{{LOOP_CONTEXT}}',
}

export enum MarketAnalysisUserPromptPart {
  Intro =
    'Conduct a comprehensive market analysis for this game loop design. ',
  ToolsSuffix =
    'Use all available tools to gather data, then generate a complete report.',
}

export enum MastraMessageRole {
  Assistant = 'assistant',
  System = 'system',
  User = 'user',
}

export enum MarketAnalysisProgressMessage {
  StartingUi = 'Starting market analysis...',
  StartingLog = 'Starting market analysis',
  Researching = 'Researching market data...',
  Complete = 'Market analysis complete.',
  NoStructuredReport = 'Analysis finished without structured report.',
  Initializing = 'Initializing market analysis...',
}

export enum MarketAnalysisErrorMessage {
  Unknown = 'Unknown error',
}

export enum MarketAnalysisFailurePrefix {
  AnalysisFailed = 'Analysis failed: ',
}
