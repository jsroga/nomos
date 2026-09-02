/**
 * Change key for storyteller hydration.
 *
 * The hydration effect only re-runs when this value changes, so anything the
 * key does not cover can arrive in a later payload and never reach the UI. It
 * used to sample five hand-picked values (worldDescription, worldRules count,
 * soundtracks count); a project whose only new content was plotTwists produced
 * an identical key, so twists stayed invisible until an unrelated edit or a
 * reload happened to move one of those five. Adding fields one at a time is how
 * that bug keeps coming back, so the key now covers the whole payload.
 */

export interface HydrationSignatureSource {
  id?: string
  series_bible?: Record<string, unknown>
  story_plan?: Record<string, unknown>
}

export function hydrationSignatureOf(
  project: HydrationSignatureSource | null | undefined
): string | null {
  if (!project?.id) return null
  return JSON.stringify({
    id: project.id,
    storyPlan: project.story_plan ?? null,
    seriesBible: project.series_bible ?? null,
  })
}
