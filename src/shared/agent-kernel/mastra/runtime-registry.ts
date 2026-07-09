/**
 * Runtime registry — dependency inversion between domains and the central
 * Mastra instance.
 *
 * shared/ MAY NOT import domains (ESLint boundary rule), but the single
 * production Mastra instance must register domain agents and workflows.
 * Domains therefore push their runtime here at module-load time (see
 * `src/domains/storyteller/io/mastra-runtime.ts`), and `getMastraInstance()`
 * drains the registry when it constructs the instance.
 *
 * Ordering contract: a domain's registration module must be imported before
 * the first `getMastraInstance()` call. The storyteller tools barrel imports
 * its registration module for exactly this reason. Late registrations are
 * ignored with a loud warning — Mastra cannot add workflows to a live
 * instance.
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

export function registerMastraModule(module: MastraRuntimeModule): void {
  if (consumed) {
    console.warn(
      '⚠️ [Mastra] Runtime module registered AFTER the instance was created — ignored. ' +
        `Agents: [${Object.keys(module.agents ?? {}).join(', ')}], ` +
        `workflows: [${Object.keys(module.workflows ?? {}).join(', ')}]. ` +
        'Import the domain registration module before the first getMastraInstance() call.'
    )
    return
  }
  Object.assign(pendingAgents, module.agents ?? {})
  Object.assign(pendingWorkflows, module.workflows ?? {})
}

/** Drain registrations for instance construction. Called once by getMastraInstance(). */
export function consumeMastraRegistrations(): {
  agents: Record<string, Agent>
  workflows: Record<string, AnyWorkflow>
} {
  consumed = true
  return { agents: { ...pendingAgents }, workflows: { ...pendingWorkflows } }
}
