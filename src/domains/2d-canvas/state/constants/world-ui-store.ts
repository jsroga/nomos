export enum WorldGenOperationType {
  WorldGen = 'world-gen',
}

export const WORLD_GEN_REPAINTING_LABEL = 'Repainting'

export enum GlobalOperationStatus {
  InProgress = 'in-progress',
}

/** Review dialog queue payloads (replaces WorldGenReviewEvent CustomEvents). */
export enum WorldGenReviewType {
  Upscale = 'upscale',
  Generation = 'generation',
  Fidelity = 'fidelity',
}

export interface WorldGenReviewPayload {
  type: WorldGenReviewType
  tileX: number
  tileY: number
  newUrl: string
  variantUrls?: string[]
  originalUrl?: string
  tokenId?: string
  runId?: string
}

export interface MjGridPayload {
  tileId: string
  tileX: number
  tileY: number
  gridImageUrl: string
  buttons: unknown[]
  taskId: string
}
