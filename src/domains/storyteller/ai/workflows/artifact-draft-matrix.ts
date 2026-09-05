import '@/shared/data/server-guard'
import { ArtifactKind } from '@/domains/storyteller/core/types/artifact-kind'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { ProblemType } from '@/domains/storyteller/core/types/finding'

/** Light-pipeline token cap (beats keep the 6_000 author canon budget). */
export const ARTIFACT_DRAFT_TOKEN_BUDGET = 4_000

export interface ArtifactDraftMatrixRow {
  readonly kind: ArtifactKind
  readonly section?: BibleSection
  readonly criticScopes: readonly ProblemType[]
  readonly humanizer: false
  readonly lawOfMotion: false
  readonly budgetTokenCap: number
}

function matrixRow(
  kind: ArtifactKind,
  criticScopes: readonly ProblemType[],
  section?: BibleSection,
): ArtifactDraftMatrixRow {
  return {
    kind,
    section,
    criticScopes,
    humanizer: false,
    lawOfMotion: false,
    budgetTokenCap: ARTIFACT_DRAFT_TOKEN_BUDGET,
  }
}

const CONTINUITY = [ProblemType.ChapterContinuity] as const
const STAKES = [ProblemType.DecisionOwnership] as const

export const ARTIFACT_DRAFT_MATRIX: readonly ArtifactDraftMatrixRow[] = [
  matrixRow(ArtifactKind.BibleSection, CONTINUITY, BibleSection.WORLD_DESCRIPTION),
  matrixRow(ArtifactKind.BibleSection, CONTINUITY, BibleSection.WORLD_RULES),
  matrixRow(ArtifactKind.BibleSection, CONTINUITY, BibleSection.FACTIONS),
  matrixRow(ArtifactKind.BibleSection, CONTINUITY, BibleSection.INSPIRATIONS),
  matrixRow(ArtifactKind.BibleSection, CONTINUITY, BibleSection.PLOT_TWISTS),
  matrixRow(ArtifactKind.BibleSection, CONTINUITY, BibleSection.EPISODE_ROADMAP),
  matrixRow(ArtifactKind.BibleSection, CONTINUITY, BibleSection.CAST),
  matrixRow(ArtifactKind.BibleSection, CONTINUITY, BibleSection.SOUNDTRACKS),
  matrixRow(ArtifactKind.BibleSection, CONTINUITY, BibleSection.MOODBOARD),
  matrixRow(ArtifactKind.BibleSection, CONTINUITY, BibleSection.ITEMS),
  matrixRow(ArtifactKind.BibleSection, CONTINUITY, BibleSection.EVENTS),
  matrixRow(ArtifactKind.EpisodePremise, STAKES),
  matrixRow(ArtifactKind.Character, CONTINUITY),
]

export function artifactDraftMatrixRow(
  kind: ArtifactKind,
  section?: BibleSection,
): ArtifactDraftMatrixRow | undefined {
  return ARTIFACT_DRAFT_MATRIX.find(row => {
    if (row.kind !== kind) return false
    if (kind === ArtifactKind.BibleSection) return row.section === section
    return row.section === undefined
  })
}
