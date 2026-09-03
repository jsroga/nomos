import { z } from 'zod'

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

export const FindingSchema = z.object({
  location: z.object({
    beatId: z.string().min(1),
    paragraph: z.number().int().nonnegative(),
    quote: z.string().min(1),
  }),
  problemType: z.nativeEnum(ProblemType),
  whatHappensNow: z.string().min(1),
  whyItFails: z.string().min(1),
  revisionDirection: z.string().min(1),
  severity: z.nativeEnum(FindingSeverity),
  promoteToProjectRule: z.boolean().default(false),
})

export type Finding = z.infer<typeof FindingSchema>
