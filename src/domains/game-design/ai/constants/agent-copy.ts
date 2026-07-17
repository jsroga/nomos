export enum ConversationRole {
  User = 'user',
  Assistant = 'assistant',
}

export enum ConversationRoleLabel {
  User = 'User',
  Assistant = 'Assistant',
}

export enum ListSeparator {
  CommaSpace = ', ',
}

export enum NewlineSeparator {
  Single = '\n',
  Double = '\n\n',
}

export enum GameDesignLoopTypeDefault {
  Core = 'core',
}

export enum GameDesignAgentCopy {
  MemorySearchDefault = 'game loop design',
  RelevantPatternsHeader = '\n\n## Relevant Game Design Patterns\n',
  MemorySearchFailed = 'Memory search failed:',
  DefaultGoal = 'Analyze and improve the game loop design',
  RecentConversationHeader = '## Recent conversation',
  RunWithContextFailed = 'GameDesignAgent.runWithContext failed:',
  ProcessingError = 'An error occurred during processing.',
  NoDescription = 'No description',
  ExistingLoopsHeader = '## Existing Loops',
  ExistingMechanicsHeader = '## Existing Mechanics',
  ToolAnalysis = 'analysis',
  PatternBulletPrefix = '- ',
}

export enum GameDesignAgentPromptCopy {
  GoalPrefix = 'Goal: ',
  ContextPrefix = 'Context:\n',
  GoalCurrentPrefix = 'Goal (current message): ',
  AnalyzeFooter = `Please analyze and respond with your thoughts and recommendations.
If you use any tools, describe what you learned from them.`,
}
