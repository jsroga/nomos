/**
 * Columns a PATCH caller may write on a beat.
 *
 * `id`, `episodeId`, `projectId` and `userId` are deliberately absent.
 */
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

export function pickBeatPatchUpdates(body: Record<string, unknown>): Record<string, unknown> {
  const update: Record<string, unknown> = {}
  for (const column of Object.values(BeatPatchColumn)) {
    if (body[column] !== undefined) update[column] = body[column]
  }
  return update
}
