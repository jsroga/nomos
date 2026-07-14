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
import {
  LIST_JOIN_SEPARATOR,
  MASTRA_LATE_REGISTRATION_IMPORT_HINT,
  MASTRA_LATE_REGISTRATION_WARN_PREFIX,
} from '@/shared/agent-kernel/constants/runtime-registry'

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
      MASTRA_LATE_REGISTRATION_WARN_PREFIX +
        `Agents: [${Object.keys(module.agents ?? {}).join(LIST_JOIN_SEPARATOR)}], ` +
        `workflows: [${Object.keys(module.workflows ?? {}).join(LIST_JOIN_SEPARATOR)}]. ` +
        MASTRA_LATE_REGISTRATION_IMPORT_HINT
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
