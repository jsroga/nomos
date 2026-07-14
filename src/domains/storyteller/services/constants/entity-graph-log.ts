export enum EntityGraphLog {
  GraphTraversalFailed = '[EntityGraphService] Graph traversal failed:',
  FailedToBuildEmbedding = '[EntityGraphService] Failed to build embedding:',
  InvalidQueryEmbedding = '[EntityGraphService] Invalid query embedding',
  SemanticSearchFailed = '[EntityGraphService] Semantic search failed:',
  FailedGetDirectRelationships = '[EntityGraphService] Failed to get direct relationships:',
  BatchSimilarityFailed = '[EntityGraphService] Batch similarity query failed, falling back:',
  FailedBuildProjectGraph = '[EntityGraphService] Failed to build project graph:',
}
