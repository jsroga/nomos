/**
 * Admin-configurable model settings — the DB-backed layer the model resolvers
 * consult (below the per-request picker/override, above env defaults).
 *
 * An in-memory cache keeps `getConfiguredModel(role)` synchronous so the
 * resolvers (`resolveRoleModel`, `resolveGameDesignModel`, …) stay sync. The
 * cache is warmed once at server startup (`instrumentation.register`) and
 * updated in place on admin save. When unset (tests, cold start before warm)
 * every lookup returns undefined and the resolvers fall back to env → auto-beta.
 */

import '@/shared/data/server-guard'
import { MODEL_SETTING_DEFAULT_ROLE } from './constants/model-settings'

const cache = new Map<string, string>()
let loaded = false
let warmStarted = false

/**
 * Lazily warm the cache once, in a Node server process only. NOT in unit tests
 * (VITEST) and never eagerly (importing the DB layer into Edge bundles is what
 * broke `instrumentation.ts` — pg needs node:util/types). Fire-and-forget:
 * the first resolver call may miss the cache and fall back to auto-beta; the
 * next one sees the loaded settings.
 */
function maybeWarm(): void {
  if (warmStarted || loaded) return
  if (!process.env.DATABASE_URL || process.env.VITEST) return
  warmStarted = true
  void loadModelSettings().catch(() => {})
}

/**
 * Configured OpenRouter model id for a slot, falling back to the `default` slot.
 * Returns undefined when nothing is configured (resolver then uses env/default).
 */
export function getConfiguredModel(role: string): string | undefined {
  maybeWarm()
  return cache.get(role) ?? cache.get(MODEL_SETTING_DEFAULT_ROLE)
}

export function isModelSettingsLoaded(): boolean {
  return loaded
}

/** Load all slots from the DB into the cache. No-op without DATABASE_URL. */
export async function loadModelSettings(): Promise<Record<string, string>> {
  if (!process.env.DATABASE_URL) return {}
  const { db } = await import('@/db/client')
  const { modelSettings } = await import('@/db/schema')
  const rows = await db.select().from(modelSettings)
  cache.clear()
  for (const row of rows) cache.set(row.role, row.model)
  loaded = true
  return Object.fromEntries(cache)
}

/** Current cache snapshot (does not hit the DB). */
export function getModelSettingsSnapshot(): Record<string, string> {
  return Object.fromEntries(cache)
}

/** Upsert a slot (admin-gated caller) and update the cache in place. */
export async function setModelSetting(
  role: string,
  model: string,
  updatedBy?: string
): Promise<void> {
  const { db } = await import('@/db/client')
  const { modelSettings } = await import('@/db/schema')
  await db
    .insert(modelSettings)
    .values({ role, model, updatedBy: updatedBy ?? null })
    .onConflictDoUpdate({
      target: modelSettings.role,
      set: { model, updatedBy: updatedBy ?? null, updatedAt: new Date() },
    })
  cache.set(role, model)
}

/** Remove a slot (revert to env/default) and drop it from the cache. */
export async function clearModelSetting(role: string): Promise<void> {
  const { db } = await import('@/db/client')
  const { modelSettings } = await import('@/db/schema')
  const { eq } = await import('drizzle-orm')
  await db.delete(modelSettings).where(eq(modelSettings.role, role))
  cache.delete(role)
}

/** Test-only reset of the in-memory cache. */
export function __resetModelSettingsCache(): void {
  cache.clear()
  loaded = false
  warmStarted = false
}

/** Test-only: seed a slot in the cache without hitting the DB. */
export function __setModelSettingForTest(role: string, model: string): void {
  cache.set(role, model)
}
