export const HYBRID_SEARCH_VECTOR_FAILED_LOG = '[HybridSearch] Vector search failed:'
export const HYBRID_SEARCH_KEYWORD_FAILED_LOG = '[HybridSearch] Keyword search failed:'

export enum HybridSearchMode {
  Bm25 = 'bm25',
  Vector = 'vector',
  Hybrid = 'hybrid',
}
