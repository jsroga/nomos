/**
 * Columns a PATCH caller may write on a beat.
 *
 * `id`, `episodeId`, `projectId` and `userId` are deliberately absent.
 */
import { z } from 'zod'

export enum BeatPatchColumn {
  Logline = 'logline',
  BeatType = 'beatType',
  Content = 'content',
  VisualHook = 'visualHook',
  CharactersInvolved = 'charactersInvolved',
  EmotionalShifts = 'emotionalShifts',
  CausalDependencies = 'causalDependencies',
  SetupsPayoffs = 'setupsPayoffs',
  Status = 'status',
  ImageUrl = 'imageUrl',
  ImagePrompt = 'imagePrompt',
}

const optionalText = z.string().nullable().optional()

export const beatPatchRequestSchema = z.object({
  [BeatPatchColumn.Logline]: optionalText,
  [BeatPatchColumn.BeatType]: optionalText,
  [BeatPatchColumn.Content]: optionalText,
  [BeatPatchColumn.VisualHook]: optionalText,
  [BeatPatchColumn.CharactersInvolved]: z.unknown().optional(),
  [BeatPatchColumn.EmotionalShifts]: z.unknown().optional(),
  [BeatPatchColumn.CausalDependencies]: z.unknown().optional(),
  [BeatPatchColumn.SetupsPayoffs]: z.unknown().optional(),
  [BeatPatchColumn.Status]: optionalText,
  [BeatPatchColumn.ImageUrl]: optionalText,
  [BeatPatchColumn.ImagePrompt]: optionalText,
})

export type BeatPatchRequest = z.infer<typeof beatPatchRequestSchema>

export function beatPatchRequestRecord(body: BeatPatchRequest): Record<string, unknown> {
  const record: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) record[key] = value
  }
  return record
}

export function pickBeatPatchUpdates(body: Record<string, unknown>): Record<string, unknown> {
  const update: Record<string, unknown> = {}
  for (const column of Object.values(BeatPatchColumn)) {
    if (body[column] !== undefined) update[column] = body[column]
  }
  return update
}
