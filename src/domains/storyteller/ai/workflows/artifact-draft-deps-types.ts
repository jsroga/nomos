import type { ArtifactDraftInput } from '@/domains/storyteller/ai/workflows/artifact-draft-contract'
import type { Finding, ProblemType } from '@/domains/storyteller/core/types/finding'

export type { ArtifactDraftInput }

export interface ArtifactDraftAssembleResult {
  canonText: string
  worldRules: string[]
}

export interface ArtifactDraftPersistResult {
  persisted: boolean
  message: string
}

export interface ArtifactDraftDeps {
  assemble: (input: ArtifactDraftInput) => Promise<ArtifactDraftAssembleResult>
  checkDeterministic: (
    input: ArtifactDraftInput & ArtifactDraftAssembleResult
  ) => Promise<Finding[]>
  critique: (scope: ProblemType, draft: string, canonText: string) => Promise<string>
  persist: (input: ArtifactDraftInput) => Promise<ArtifactDraftPersistResult>
}
