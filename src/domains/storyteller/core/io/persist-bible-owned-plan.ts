// Relative imports, not `@/…`: this module is reachable from the Mastra Studio
// entry, whose bundler leaves these aliases unresolved and emits bare `@/db`
// imports into `.mastra/output` (ERR_MODULE_NOT_FOUND at runtime).
import '../../../../shared/data/server-guard'
import { projects, seriesBibles, storyPlans } from '../../../../db'
import { db } from '../../../../db/client'
import { eq } from 'drizzle-orm'
import { deepMergeRecords, recordFromJson } from '../../../../shared/data/deep-merge'
import { pickBibleOwnedPlanFields } from '../utils/bible-populated-fields'

async function mergeJsonbContent(
  existing: unknown,
  updates: Record<string, unknown>,
  write: (merged: Record<string, unknown>) => Promise<void>,
) {
  const merged = deepMergeRecords(recordFromJson(existing), updates)
  await write(merged)
}

/** Write soundtrack / inspirations onto the project bible, never an episode row. */
export async function persistBibleOwnedPlanFields(
  projectId: string,
  updates: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const media = pickBibleOwnedPlanFields(updates)
  if (Object.keys(media).length === 0) return {}

  const [bible] = await db
    .select()
    .from(seriesBibles)
    .where(eq(seriesBibles.projectId, projectId))
    .limit(1)
  await mergeJsonbContent(bible?.content, media, async merged => {
    await db
      .insert(seriesBibles)
      .values({ projectId, content: merged, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: seriesBibles.projectId,
        set: { content: merged, updatedAt: new Date() },
      })
    await db
      .update(projects)
      .set({ seriesBible: merged, updatedAt: new Date() })
      .where(eq(projects.id, projectId))
  })

  const [plan] = await db
    .select()
    .from(storyPlans)
    .where(eq(storyPlans.projectId, projectId))
    .limit(1)
  await mergeJsonbContent(plan?.content, media, async merged => {
    await db
      .insert(storyPlans)
      .values({ projectId, content: merged, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: storyPlans.projectId,
        set: { content: merged, updatedAt: new Date() },
      })
  })

  return media
}
