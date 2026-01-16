/**
 * RAG Module
 *
 * Exports RAG pipeline components.
 */

export {
  SemanticChunker,
  getSemanticChunker,
  type DocumentChunk,
  type ChunkConfig,
  DEFAULT_CONFIG as CHUNKER_DEFAULT_CONFIG,
  DOCUMENT_TYPE_CONFIGS,
} from './semantic-chunker'

export {
  HybridSearchEngine,
  getHybridSearchEngine,
  type SearchResult,
  type HybridSearchConfig,
  HYBRID_SEARCH_DEFAULT_CONFIG,
} from './hybrid-search'

export {
  QueryExpander,
  getQueryExpander,
  expandQueryHeuristic,
  expandQueryLLM,
  type QueryExpansion,
  type QueryExpanderConfig,
  type ExpansionStrategy,
} from './query-expander'

export {
  Reranker,
  getReranker,
  isCohereAvailable,
  getRecommendedProvider,
  type RerankerConfig,
  type RerankerProvider,
  type RerankResult,
} from './reranker'
