export const GAME_DESIGN_EMBEDDING_MODEL = 'text-embedding-3-small'

export enum VectorIndexMetric {
  Cosine = 'cosine',
}

export enum GameDesignPatternDelimiter {
  ExamplesJoin = '|||',
  TagsJoin = ',',
  ExamplesTextJoin = '; ',
}

export enum GameDesignMemoryError {
  DatabaseUrlRequired = 'DATABASE_URL environment variable is required for GameDesignMemory',
}
