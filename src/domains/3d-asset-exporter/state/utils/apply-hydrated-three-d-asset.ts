import {
  GenerationStatus,
  type GenerationMetadata,
  type MeshyResult,
} from '../../core/types/three-d-generation'
import type { ThreeDHydrationResult } from './hydrate-three-d-asset'

export function shouldResumeGeneration(metadata: GenerationMetadata | null): string | null {
  if (
    metadata?.triggerRunId &&
    metadata.generationStatus === GenerationStatus.Processing
  ) {
    return metadata.triggerRunId
  }
  return null
}

export function resolveHydratedGenerationRun(
  resumeGenerationRunId: string | undefined,
  wasProcessing: boolean,
): { runId: string | null; isGenerating: boolean } | null {
  if (resumeGenerationRunId) {
    return { runId: resumeGenerationRunId, isGenerating: true }
  }
  if (wasProcessing) {
    return { runId: null, isGenerating: false }
  }
  return null
}

export function applyHydratedStaticFields(
  hydrated: ThreeDHydrationResult,
  apply: {
    setModelUrl: (url: string | undefined) => void
    setGenerationResult: (result: MeshyResult | null) => void
    setMeshyTaskId: (id: string | null) => void
    setRemeshResult: (result: MeshyResult | null) => void
    setRemeshModelUrl: (url: string | null) => void
  },
): void {
  if (hydrated.modelFilename) apply.setModelUrl(hydrated.modelFilename)
  if (hydrated.generationResult) apply.setGenerationResult(hydrated.generationResult)
  if (hydrated.meshyTaskId) apply.setMeshyTaskId(hydrated.meshyTaskId)
  if (hydrated.remeshResult) apply.setRemeshResult(hydrated.remeshResult)
  if (hydrated.remeshModelUrl) apply.setRemeshModelUrl(hydrated.remeshModelUrl)
}
