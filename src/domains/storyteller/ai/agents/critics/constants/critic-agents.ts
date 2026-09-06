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
  Continuity = 'Finds knowledge violations, timeline errors, and canon contradictions.',
  Prose = 'Finds stated emotion, clichés, POV breaks, and voice flattening.',
  Stakes = 'Finds costless beats, unearned victories, and slack tension.',
  Dialogue = 'Finds adjacent talking-heads and disembodied said-book speech.',
}

export enum StorytellerModelRoleKey {
  Critic = 'critic',
}
