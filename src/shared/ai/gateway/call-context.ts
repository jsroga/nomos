/**
 * The project a model call bills to, carried across an agent invocation.
 *
 * Mastra agents are reached from twenty call sites — critics, the muse, beat
 * planning — none of which hold a `ProjectScope`. Threading one through every
 * signature would churn the whole agent layer to move a value that is constant
 * for the whole request.
 *
 * So the scope is established once at the boundary that already proved it (a
 * route, or a job with `systemScope`) and read by the meter. This is the same
 * shape `mcp/core/request-context.ts` already uses.
 *
 * **No context means no row.** A call outside a boundary is left unrecorded
 * rather than attributed to a guess — a row against the wrong project is worse
 * than a missing one, and worse than a visible gap.
 */
import { AsyncLocalStorage } from 'node:async_hooks'
import type { ProjectScope } from '@/shared/auth/project-scope'

export interface GatewayCallContext {
  readonly scope: ProjectScope
  readonly traceId?: string
}

const storage = new AsyncLocalStorage<GatewayCallContext>()

/** Run `fn` with the billing context every model call inside it will use. */
export function withGatewayContext<T>(context: GatewayCallContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(context, fn)
}

/** The context, or undefined outside a boundary that set one. */
export function currentGatewayContext(): GatewayCallContext | undefined {
  return storage.getStore()
}
