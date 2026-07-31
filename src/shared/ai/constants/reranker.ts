export enum RerankerProviderId {
  Cohere = 'cohere',
  CrossEncoder = 'cross-encoder',
  Heuristic = 'heuristic',
}

export enum CohereRerankModel {
  /** OpenRouter model id for Cohere Rerank v3.5 */
  EnglishV3 = 'cohere/rerank-v3.5',
}

export enum RerankerLog {
  CohereKeyMissing = 'OPENROUTER_API_KEY not set, falling back to heuristic reranking',
  CohereFailed = 'OpenRouter reranking failed, falling back to heuristic:',
  CrossEncoderNotImplemented = 'Cross-encoder reranking not yet implemented, using heuristic',
}
