import { z } from 'zod'

export enum AfterBeatStatePlace {
  Scene = 'scene',
}

export enum AfterBeatStateWriteError {
  MissingBeatId = 'AfterBeatState persist missed: beat id absent',
  MissingOwner = 'AfterBeatState persist missed: no next-decision owner',
  SaveMissed = 'AfterBeatState persist missed: no beat row written',
}

export const AfterBeatPositionSchema = z.object({
  character: z.string().min(1),
  place: z.string().min(1),
})

export const AfterBeatInjurySchema = z.object({
  character: z.string().min(1),
  note: z.string().min(1),
})

export const AfterBeatObjectHeldSchema = z.object({
  character: z.string().min(1),
  object: z.string().min(1),
})

export const AfterBeatStateSchema = z.object({
  positions: z.array(AfterBeatPositionSchema),
  injuries: z.array(AfterBeatInjurySchema),
  objectsHeld: z.array(AfterBeatObjectHeldSchema),
  openPlants: z.array(z.string().min(1)),
  nextDecisionOwner: z.string().min(1),
})

export type AfterBeatState = z.infer<typeof AfterBeatStateSchema>

export function afterBeatStateRowSaved(updated: readonly unknown[]): boolean {
  return updated.length > 0
}

export function requirePersistedBeatId(beatId: string | undefined): string {
  if (!beatId) {
    throw new Error(AfterBeatStateWriteError.MissingBeatId)
  }
  return beatId
}

export function afterBeatStateFromApprovedBeat(input: {
  charactersInvolved: readonly string[]
  setupFor?: string
  payoffFrom?: string
}): AfterBeatState {
  const owner = input.charactersInvolved[0]?.trim() ?? ''
  if (!owner) {
    throw new Error(AfterBeatStateWriteError.MissingOwner)
  }
  const setupFor = input.setupFor?.trim() ?? ''
  const payoffFrom = input.payoffFrom?.trim() ?? ''
  return AfterBeatStateSchema.parse({
    positions: input.charactersInvolved.map(character => ({
      character,
      place: AfterBeatStatePlace.Scene,
    })),
    injuries: [],
    objectsHeld:
      payoffFrom.length > 0 ? [{ character: owner, object: payoffFrom }] : [],
    openPlants: setupFor.length > 0 ? [setupFor] : [],
    nextDecisionOwner: owner,
  })
}
