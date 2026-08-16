import type { ContextImageVariant } from '@/shared/ai/contextAssembler'
import type { PackedCropRect } from '@/shared/ai/context-pack-layout'
import { ContextAssemblyVariant } from '../../constants/tile-generation-service'

export interface TileGenRunState {
  runId: string
  projectId: string
  x: number
  y: number
  prompt: string
  startedAt: string
}

export interface FollowUpContextPayload {
  images: Partial<Record<ContextImageVariant, string>>
  maskBase64?: string
  preferredVariant: ContextImageVariant
  cropRect?: PackedCropRect
  packedWidth?: number
  packedHeight?: number
}

export type NormalizedTileGenContext = FollowUpContextPayload

export function normalizeTileGenContext(
  contextFromCaller?: FollowUpContextPayload | string
): NormalizedTileGenContext | undefined {
  if (typeof contextFromCaller === 'string') {
    return {
      images: { [ContextAssemblyVariant.CanonicalFullContext]: contextFromCaller },
      preferredVariant: ContextAssemblyVariant.CanonicalFullContext satisfies ContextImageVariant,
    }
  }
  return contextFromCaller
}
