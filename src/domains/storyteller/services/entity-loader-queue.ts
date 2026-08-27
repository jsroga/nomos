import type { EntityReference } from '@/domains/storyteller/core/entities/entity-references'

export interface EntityLoadWaiter {
  resolve: (value: EntityReference | null) => void
  reject: (reason?: unknown) => void
}

export interface EntityLoadBatchItem {
  waiters: EntityLoadWaiter[]
  projectId: string
  context?: string
}

/** project-scope: none — browser-side queue; the resolve route mints the scope. */
export function enqueueEntityLoad(
  queue: Map<string, EntityLoadBatchItem>,
  key: string,
  projectId: string,
  context: string | undefined,
  waiter: EntityLoadWaiter
): void {
  const existing = queue.get(key)
  if (!existing) {
    queue.set(key, { waiters: [waiter], projectId, context })
    return
  }
  existing.waiters.push(waiter)
  if (context && context.length > (existing.context?.length ?? 0)) {
    existing.context = context
  }
}

export function resolveEntityLoadWaiters(
  item: EntityLoadBatchItem,
  value: EntityReference | null
): void {
  for (const waiter of item.waiters) waiter.resolve(value)
}

export function rejectEntityLoadWaiters(item: EntityLoadBatchItem, error: unknown): void {
  for (const waiter of item.waiters) waiter.reject(error)
}
