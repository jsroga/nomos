/**
 * Admin plugin registry (Track A4). Seeded from the first-party plugins; extra
 * plugins register via `registerAdminPlugin` at import (mirrors the canvas
 * module-registry / Mastra runtime-registry inversion). The dashboard reads
 * `getAdminSections()` to build its nav.
 */

import { AdminPluginMount, type AdminPlugin } from './types'
import { FIRST_PARTY_ADMIN_PLUGINS } from '@/shared/admin/constants/admin-plugins'

const registry = new Map<string, AdminPlugin>(
  FIRST_PARTY_ADMIN_PLUGINS.map(plugin => [plugin.id, plugin])
)

/** Add or override a plugin (later same-id registration wins). */
export function registerAdminPlugin(plugin: AdminPlugin): void {
  registry.set(plugin.id, plugin)
}

/** All registered plugins, ordered by `order` then registration. */
export function getAdminPlugins(): AdminPlugin[] {
  return [...registry.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

/** Plugins that mount as a dashboard section (nav source). */
export function getAdminSections(): AdminPlugin[] {
  return getAdminPlugins().filter(plugin => plugin.mount === AdminPluginMount.AdminSection)
}
