import { z } from 'zod'
import { BibleSection } from '@/domains/storyteller/core/types/enums'

/** Closed catalog from the novel-writing revision checklist. */
export enum ProblemType {
  CognitionAndDisclosure = 'cognition_and_disclosure',
  DecisionOwnership = 'decision_ownership',
  DialogueAdjacency = 'dialogue_adjacency',
  SpatialOrActionCausality = 'spatial_or_action_causality',
  ChapterContinuity = 'chapter_continuity',
  CharacterIntroduction = 'character_introduction',
  SceneStructure = 'scene_structure',
  StyleFidelity = 'style_fidelity',
  RealismConstraint = 'realism_constraint',
  ViewpointOverreach = 'viewpoint_overreach',
  Pacing = 'pacing',
  DialogueClarity = 'dialogue_clarity',
  DialogueEmbodiment = 'dialogue_embodiment',
}

export enum FindingSeverity {
  Error = 'error',
  Warning = 'warning',
}

export enum FindingLocationRefine {
  ExactlyOneAnchor = 'exactly one of beatId, section, or characterId',
}

function hasExactlyOneLocationAnchor(location: {
  beatId?: string
  section?: BibleSection
  characterId?: string
}): boolean {
  let anchors = 0
  if (location.beatId !== undefined) anchors += 1
  if (location.section !== undefined) anchors += 1
  if (location.characterId !== undefined) anchors += 1
  return anchors === 1
}

export const FindingSchema = z.object({
  location: z
    .object({
      beatId: z.string().min(1).optional(),
      section: z.nativeEnum(BibleSection).optional(),
      characterId: z.string().min(1).optional(),
      paragraph: z.number().int().nonnegative(),
      quote: z.string().min(1),
    })
    .refine(hasExactlyOneLocationAnchor, {
      message: FindingLocationRefine.ExactlyOneAnchor,
    }),
  problemType: z.nativeEnum(ProblemType),
  whatHappensNow: z.string().min(1),
  whyItFails: z.string().min(1),
  revisionDirection: z.string().min(1),
  severity: z.nativeEnum(FindingSeverity),
  promoteToProjectRule: z.boolean().default(false),
})

export type Finding = z.infer<typeof FindingSchema>
