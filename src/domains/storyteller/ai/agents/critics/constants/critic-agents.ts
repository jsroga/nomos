export enum CriticAgentId {
  Continuity = 'continuity-critic',
  Prose = 'prose-critic',
  Stakes = 'stakes-critic',
  Dialogue = 'dialogue-critic',
}

export enum CriticAgentName {
  Continuity = 'Continuity Critic',
  Prose = 'Prose Critic',
  Stakes = 'Stakes Critic',
  Dialogue = 'Dialogue Critic',
}

export enum CriticAgentDescription {
  Continuity = 'Storyteller · Finds knowledge, timeline, and canon contradictions.',
  Prose = 'Storyteller · Finds stated emotion, clichés, POV breaks, and flattened voice.',
  Stakes = 'Storyteller · Finds costless beats, unearned victories, and slack tension.',
  Dialogue = 'Storyteller · Finds talking-heads and disembodied said-book speech.',
}

export enum StorytellerModelRoleKey {
  Critic = 'critic',
}

export enum GenerateStructuredSpan {
  Default = 'generate-structured',
}
