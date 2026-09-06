import { describe, expect, it } from 'vitest'
import { ArtifactKind } from '@/domains/storyteller/core/types/artifact-kind'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { ProblemType } from '@/domains/storyteller/core/types/finding'
import {
  ARTIFACT_DRAFT_MATRIX,
  artifactDraftMatrixRow,
} from '../artifact-draft-matrix'

describe('ARTIFACT_DRAFT_MATRIX', () => {
  it('gives every row one or two critic scopes, never three', () => {
    for (const row of ARTIFACT_DRAFT_MATRIX) {
      expect(row.criticScopes.length).toBeGreaterThanOrEqual(1)
      expect(row.criticScopes.length).toBeLessThan(3)
      expect(row.humanizer).toBe(false)
      expect(row.lawOfMotion).toBe(false)
    }
  })

  it('maps factions, world rules, items and events to continuity only', () => {
    const sections = [
      BibleSection.FACTIONS,
      BibleSection.WORLD_RULES,
      BibleSection.ITEMS,
      BibleSection.EVENTS,
    ]
    for (const section of sections) {
      const row = artifactDraftMatrixRow(ArtifactKind.BibleSection, section)
      expect(row?.criticScopes).toEqual([ProblemType.ChapterContinuity])
    }
  })

  it('never assigns cognition or dialogue problem types to artifact rows', () => {
    const banned = new Set([
      ProblemType.CognitionAndDisclosure,
      ProblemType.DialogueAdjacency,
      ProblemType.DialogueEmbodiment,
    ])
    for (const row of ARTIFACT_DRAFT_MATRIX) {
      expect(row.criticScopes.some(scope => banned.has(scope))).toBe(false)
      expect(row.humanizer).toBe(false)
    }
  })

  it('maps premise to stakes and character to continuity', () => {
    expect(artifactDraftMatrixRow(ArtifactKind.EpisodePremise)?.criticScopes).toEqual([
      ProblemType.DecisionOwnership,
    ])
    expect(artifactDraftMatrixRow(ArtifactKind.Character)?.criticScopes).toEqual([
      ProblemType.ChapterContinuity,
    ])
  })
})
