import { z } from 'zod'

export enum DraftBeatId {
  Draft = 'draft',
}

export enum EmptyCanonId {
  Unspecified = '_',
}

export const BeatDraftCanonBeatSchema = z.object({
  id: z.string().min(1),
  sequence: z.number().int(),
  content: z.string().nullable(),
  causalDependencies: z.array(z.string()),
  beatType: z.string().nullable(),
  charactersInvolved: z.array(z.string()).optional(),
})

export const BeatDraftCanonSchema = z.object({
  projectId: z.string().min(1),
  episodeId: z.string().min(1),
  sections: z.record(z.unknown()),
  beats: z.array(BeatDraftCanonBeatSchema),
  currentRoadmapSlotText: z.string(),
  otherRoadmapSlotsText: z.string(),
  nextSequence: z.number().int().positive(),
})

export type BeatDraftCanon = z.infer<typeof BeatDraftCanonSchema>
export type BeatDraftCanonBeat = z.infer<typeof BeatDraftCanonBeatSchema>

export function emptyBeatDraftCanon(overrides: Partial<BeatDraftCanon> = {}): BeatDraftCanon {
  return {
    projectId: EmptyCanonId.Unspecified,
    episodeId: EmptyCanonId.Unspecified,
    sections: {},
    beats: [],
    currentRoadmapSlotText: '',
    otherRoadmapSlotsText: '',
    nextSequence: 1,
    ...overrides,
  }
}
