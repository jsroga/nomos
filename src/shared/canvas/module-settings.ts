/**
 * Admin-configurable canvas module settings (Track A2) — the DB-backed overrides
 * the canvas host consults on top of the CANVAS_MODULES catalog defaults.
 *
 * Mirrors `@/shared/agent-kernel/model-settings`: an in-memory cache keeps
 * `getModuleConfig(key)` synchronous, warmed lazily in a Node server process
 * only (never in Edge/VITEST). Unset → the catalog default is used.
 */

import '@/shared/data/server-guard'
import { getCanvasModule } from './module-registry'
import { readString } from '@/shared/data/json-guards'

const MODULE_CONFIG_MODEL_ROLE = 'modelRole'

export interface ModuleSettingRow {
  enabled: boolean
  canvasSlot: string | null
  config: Record<string, unknown>
}

export interface ResolvedModuleConfig {
  enabled: boolean
  canvasSlot: string | null
  /** Effective model slot: admin override → catalog default → undefined. */
  modelRole: string | undefined
}

const cache = new Map<string, ModuleSettingRow>()
let loaded = false
let warmStarted = false

function maybeWarm(): void {
  if (warmStarted || loaded) return
  if (!process.env.DATABASE_URL || process.env.VITEST) return
  warmStarted = true
  void loadModuleSettings().catch(() => {})
}

/** Effective config for a module: catalog default overlaid with the admin row. */
export function getModuleConfig(moduleKey: string): ResolvedModuleConfig {
  maybeWarm()
  const def = getCanvasModule(moduleKey)
  const row = cache.get(moduleKey)
  const overrideRole = row ? readString(row.config[MODULE_CONFIG_MODEL_ROLE]) : undefined
  return {
    enabled: row?.enabled ?? def?.enabledByDefault ?? true,
    canvasSlot: row?.canvasSlot ?? null,
    modelRole: overrideRole ?? def?.modelRole,
  }
}

export function isModuleEnabled(moduleKey: string): boolean {
  return getModuleConfig(moduleKey).enabled
}

export function isModuleSettingsLoaded(): boolean {
  return loaded
}

/** Load all module rows from the DB into the cache. No-op without DATABASE_URL. */
export async function loadModuleSettings(): Promise<Record<string, ModuleSettingRow>> {
  if (!process.env.DATABASE_URL) return {}
  const { db } = await import('@/db/client')
  const { moduleSettings } = await import('@/db/schema')
  const rows = await db.select().from(moduleSettings)
  cache.clear()
  for (const row of rows) {
    cache.set(row.moduleKey, {
      enabled: row.enabled,
      canvasSlot: row.canvasSlot,
      config: isRecord(row.config) ? row.config : {},
    })
  }
  loaded = true
  return Object.fromEntries(cache)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Current cache snapshot (does not hit the DB). */
export function getModuleSettingsSnapshot(): Record<string, ModuleSettingRow> {
  return Object.fromEntries(cache)
}

export interface ModuleSettingUpdate {
  enabled?: boolean
  canvasSlot?: string | null
  modelRole?: string | null
}

/** Upsert a module's overrides (admin-gated caller) and update the cache. */
export async function setModuleSetting(
  moduleKey: string,
  update: ModuleSettingUpdate,
  updatedBy?: string
): Promise<ModuleSettingRow> {
  const prev = cache.get(moduleKey)
  const config = { ...(prev?.config ?? {}) }
  if (update.modelRole === null) Reflect.deleteProperty(config, MODULE_CONFIG_MODEL_ROLE)
  else if (update.modelRole !== undefined) config[MODULE_CONFIG_MODEL_ROLE] = update.modelRole

  const next: ModuleSettingRow = {
    enabled: update.enabled ?? prev?.enabled ?? getModuleConfig(moduleKey).enabled,
    canvasSlot: update.canvasSlot ?? prev?.canvasSlot ?? null,
    config,
  }

  const { db } = await import('@/db/client')
  const { moduleSettings } = await import('@/db/schema')
  await db
    .insert(moduleSettings)
    .values({
      moduleKey,
      enabled: next.enabled,
      canvasSlot: next.canvasSlot,
      config: next.config,
      updatedBy: updatedBy ?? null,
    })
    .onConflictDoUpdate({
      target: moduleSettings.moduleKey,
      set: {
        enabled: next.enabled,
        canvasSlot: next.canvasSlot,
        config: next.config,
        updatedBy: updatedBy ?? null,
        updatedAt: new Date(),
      },
    })
  cache.set(moduleKey, next)
  return next
}

/** Test-only reset of the in-memory cache. */
export function __resetModuleSettingsCache(): void {
  cache.clear()
  loaded = false
  warmStarted = false
}
