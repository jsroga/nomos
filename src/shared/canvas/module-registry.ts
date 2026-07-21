/**
 * Canvas module registry — the runtime surface over the module catalog. Seeded
 * from `CANVAS_MODULES`; admin config (roadmap A2) and plugins (A4) add or
 * override entries via `registerCanvasModule`. Mirrors the Mastra runtime-registry
 * inversion so the canvas host stays decoupled from individual modules.
 */

import { CANVAS_MODULES, type CanvasModuleDef } from './constants/canvas-modules'

export type { CanvasModuleDef } from './constants/canvas-modules'

const registry = new Map<string, CanvasModuleDef>(CANVAS_MODULES.map(module => [module.key, module]))

/** Add or override a canvas module (admin config / plugins). */
export function registerCanvasModule(def: CanvasModuleDef): void {
  registry.set(def.key, def)
}

/** All registered canvas modules. */
export function getCanvasModules(): CanvasModuleDef[] {
  return [...registry.values()]
}

/** A single module by key. */
export function getCanvasModule(key: string): CanvasModuleDef | undefined {
  return registry.get(key)
}

/** The assistant-ui agent id for a module's chat, if it has one. */
export function getCanvasModuleAgentId(key: string): string | undefined {
  return registry.get(key)?.chatAgentId
}
