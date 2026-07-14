export enum RagDocumentType {
  BeatDecision = 'beat_decision',
  CharacterArc = 'character_arc',
  WorldRule = 'world_rule',
  EpisodeSummary = 'episode_summary',
  UserFeedback = 'user_feedback',
  AgentReasoning = 'agent_reasoning',
}

export enum RagServiceLog {
  RetrievalFailed = '[RAG] Retrieval failed:',
  FallbackSearchFailed = '[RAG] Fallback search failed:',
}

export enum RagUnknownValue {
  Unknown = 'unknown',
}

export const RAG_CONTEXT_SEPARATOR = '\n---\n'
