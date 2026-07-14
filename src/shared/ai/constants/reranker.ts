export enum RerankerProviderId {
  Cohere = 'cohere',
  CrossEncoder = 'cross-encoder',
  Heuristic = 'heuristic',
}

export enum CohereRerankModel {
  EnglishV3 = 'rerank-english-v3.0',
}

export enum RerankerLog {
  CohereKeyMissing = 'COHERE_API_KEY not set, falling back to heuristic reranking',
  CohereFailed = 'Cohere reranking failed, falling back to heuristic:',
  CrossEncoderNotImplemented = 'Cross-encoder reranking not yet implemented, using heuristic',
}
