/**
 * Runtime registry — dependency inversion between domains and the central
 * Mastra instance.
 *
 * shared/ MAY NOT import domains (ESLint boundary rule), but the single
 * production Mastra instance must register domain agents and workflows.
 * Domains therefore push their runtime here at module-load time (see
 * `src/domains/storyteller/core/io/mastra-runtime.ts`), and `getMastraInstance()`
 * drains the registry when it constructs the instance.
 *
 * If a domain registers after the instance was already built (HMR, raced
 * import), registrations are merged and the singleton is invalidated so the
 * next `getMastraInstance()` rebuilds with the full set.
 */

import type { Agent } from '@mastra/core/agent'
import type { AnyWorkflow } from '@mastra/core/workflows'

export interface MastraRuntimeModule {
  agents?: Record<string, Agent>
  workflows?: Record<string, AnyWorkflow>
}

const pendingAgents: Record<string, Agent> = {}
const pendingWorkflows: Record<string, AnyWorkflow> = {}
let consumed = false
let invalidateMastraInstance: (() => void) | null = null

/** Wired once from mastra-instance.ts (avoids an import cycle). */
export function setMastraInstanceInvalidator(fn: () => void): void {
  invalidateMastraInstance = fn
}

export function registerMastraModule(module: MastraRuntimeModule): void {
  Object.assign(pendingAgents, module.agents ?? {})
  Object.assign(pendingWorkflows, module.workflows ?? {})
  if (!consumed) return
  consumed = false
  invalidateMastraInstance?.()
}

/** Drain registrations for instance construction. Called once by getMastraInstance(). */
export function consumeMastraRegistrations(): {
  agents: Record<string, Agent>
  workflows: Record<string, AnyWorkflow>
} {
  consumed = true
  return { agents: { ...pendingAgents }, workflows: { ...pendingWorkflows } }
}
