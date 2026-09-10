export enum GameDesignAgentId {
  GameDesignAgent = 'game-design-agent',
}

export enum GameDesignAgentLabel {
  GameDesignAgent = 'Game Design Agent',
}

export enum GameDesignAgentDescription {
  GameDesignAgent = 'Game Design · Designs loops, economy, and progression.',
}

export enum GameDesignAgentSpan {
  Run = 'GameDesignAgent.run',
  RunWithContext = 'GameDesignAgent.runWithContext',
}

export enum GameDesignSystemPromptId {
  GameDesignSystem = 'game-design-system',
}

export enum GameDesignDefaultModel {
  OpenAiGpt56Luna = 'openai:gpt-5.6-luna',
}

export enum GameDesignStreamToolChoice {
  Auto = 'auto',
}

export enum GameDesignStructuredOutputJsonPromptInjection {
  Auto = 'auto',
}

export enum GameDesignStructuredOutputErrorStrategy {
  Warn = 'warn',
}

export enum GameDesignToolStructurer {
  Id = 'game-design-tool-structurer',
  Name = 'Game Design Tool Structurer',
  Instructions = 'Produce the requested fields. Do not wrap the result in markdown.',
}

export enum GameDesignModelSeparator {
  Colon = ':',
  Slash = '/',
}
