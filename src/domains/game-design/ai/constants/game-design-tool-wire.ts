export enum GameDesignLlmModel {
  Gpt4o = 'gpt-4o',
}

export enum GameDesignLlmRole {
  User = 'user',
}

export enum GameDesignLlmTemperature {
  Creative = 0.7,
  Analytical = 0.3,
}

export enum GameDesignToolCopy {
  NoJsonInResponse = 'No JSON found in response',
  FailedToParseAiResponse = 'Failed to parse AI response',
  NoDescription = 'No description',
  NotSpecified = 'Not specified',
  Unknown = 'Unknown',
  None = 'None',
  NoneDefined = 'None defined',
  NoTransformers = '  (no transformers)',
}
