/**
 * Job-run ownership — the only module allowed to reach Trigger's run API.
 *
 * A Trigger run id is not a capability token: it is returned to the client on
 * trigger and echoed in URLs and logs. Retrieving a run therefore has to prove
 * the caller owns the project the run belongs to, or any signed-in user can
 * read any tenant's generation output, prompts and metadata.
 *
 * Ownership travels on a run tag (`project:<uuid>`) stamped at trigger time,
 * because run *metadata* is written by task code and only one task ever set a
 * project id. Tagging happens where the scope is already known — the launching
 * route — and needs no migration.
 *
 * Enforced by the `local/trigger-runs-ownership` ESLint rule: `runs.retrieve`
 * outside this file is an error.
 */
import { runs, tasks } from '@trigger.dev/sdk'
import type { AnyTask, TaskIdentifier, TaskPayload, TriggerOptions } from '@trigger.dev/sdk'
import { verifyProjectAccess } from '@/shared/auth/project-access'
import { isValidProjectId } from '@/shared/auth/security'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import {
  SystemRunReason,
  JOB_ACCESS_MESSAGE,
  JOB_LOG,
  OWNED_RUN_SUMMARY_KEYS,
  PROJECT_METADATA_KEY,
  PROJECT_TAG_PREFIX,
  UNTAGGED_RUN_GRACE_MS,
} from '@/shared/jobs/constants/owned-run'

export { OWNED_RUN_SUMMARY_KEYS, SystemRunReason, UNTAGGED_RUN_GRACE_MS }

/**
 * Raised for a missing run, an unreadable run, and a run the caller does not
 * own — deliberately one error, so callers cannot map "forbidden" to 403 and
 * confirm that someone else's run id exists.
 */
export class JobAccessError extends Error {}

type RetrievedRun = Awaited<ReturnType<typeof runs.retrieve>>

/**
 * The allowlist *is* the type: `OWNED_RUN_SUMMARY_KEYS` picks the fields of the
 * SDK's run that may cross the HTTP boundary, so adding a field to the wire
 * response requires adding it to the allowlist first.
 */
export type OwnedRunSummary = Pick<RetrievedRun, (typeof OWNED_RUN_SUMMARY_KEYS)[number]>

interface RunOwnershipSource {
  tags?: readonly string[]
  metadata?: unknown
}

/** Every task payload in this repo carries the project the work belongs to. */
interface OwnedPayload {
  projectId?: unknown
}

export function projectTag(projectId: string): string {
  return `${PROJECT_TAG_PREFIX}${projectId}`
}

/** The project a run belongs to: tag first, then the legacy metadata key. */
export function projectIdFromRun(run: RunOwnershipSource): string | null {
  for (const tag of run.tags ?? []) {
    if (!tag.startsWith(PROJECT_TAG_PREFIX)) continue
    const candidate = tag.slice(PROJECT_TAG_PREFIX.length)
    if (isValidProjectId(candidate)) return candidate
  }

  const candidate = readString(recordFromJson(run.metadata)[PROJECT_METADATA_KEY])
  if (candidate && isValidProjectId(candidate)) return candidate

  return null
}

/**
 * Written out field by field rather than spread: the defect this module exists
 * to fix was a route spreading the SDK object straight onto the wire, so a
 * field the SDK adds later must not leak by default.
 */
function summarise(run: RetrievedRun): OwnedRunSummary {
  return {
    id: run.id,
    status: run.status,
    output: run.output,
    error: run.error,
    metadata: run.metadata,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
  }
}

function isWithinUntaggedGraceWindow(createdAt: unknown): boolean {
  if (createdAt instanceof Date) return Date.now() - createdAt.getTime() < UNTAGGED_RUN_GRACE_MS
  const iso = readString(createdAt)
  if (!iso) return false
  const created = Date.parse(iso)
  if (Number.isNaN(created)) return false
  return Date.now() - created < UNTAGGED_RUN_GRACE_MS
}

/** Retrieve a run only if the caller owns the project it belongs to. */
export async function retrieveOwnedRun(runId: string, userId: string): Promise<OwnedRunSummary> {
  const run = await runs.retrieve(runId)
  if (!run) throw new JobAccessError(JOB_ACCESS_MESSAGE.NOT_FOUND)

  const projectId = projectIdFromRun({ tags: run.tags, metadata: run.metadata })

  if (!projectId) {
    // Pre-tagging runs still in flight. Time-boxed; remove with the grace window.
    if (isWithinUntaggedGraceWindow(run.createdAt)) {
      console.warn(`${JOB_LOG.UNTAGGED_GRACE}${runId}`)
      return summarise(run)
    }
    throw new JobAccessError(JOB_ACCESS_MESSAGE.NOT_FOUND)
  }

  if (!(await verifyProjectAccess(projectId, userId))) {
    throw new JobAccessError(JOB_ACCESS_MESSAGE.NOT_FOUND)
  }

  return summarise(run)
}

/**
 * Read a run with no user to check against.
 *
 * Legitimate only where there is no tenant — an in-process smoke polling the
 * run it just triggered. Taking a `SystemRunReason` keeps every such call
 * countable and reviewable; a path exemption would be acquirable by moving a
 * file, which is how `constants/` became a dumping ground.
 */
export async function retrieveSystemRun(runId: string, _reason: SystemRunReason) {
  return runs.retrieve(runId)
}

/**
 * Cancel a run only if the caller owns the project it belongs to.
 *
 * Cancelling is the write side of the same hole: without this check any signed
 * in user could abort another tenant's in-flight generation.
 */
export async function cancelOwnedRun(runId: string, userId: string): Promise<void> {
  await retrieveOwnedRun(runId, userId)
  await runs.cancel(runId)
}

/**
 * Trigger a task with its project stamped on the run.
 *
 * The project comes from the payload, which every task already carries, so a
 * caller cannot pass a scope that disagrees with the work being queued. A
 * payload with no project id is refused: the run would be unreadable, and
 * silently producing an unreadable run is worse than failing here.
 */
export async function triggerOwnedRun<TTask extends AnyTask>(
  taskId: TaskIdentifier<TTask>,
  payload: TaskPayload<TTask> & OwnedPayload,
  options: TriggerOptions = {}
) {
  const projectId = readString(payload.projectId)
  if (!projectId || !isValidProjectId(projectId)) {
    throw new JobAccessError(JOB_ACCESS_MESSAGE.MISSING_PROJECT)
  }

  const existingTags = options.tags
  const tags = [
    ...(Array.isArray(existingTags) ? existingTags : existingTags ? [existingTags] : []),
    projectTag(projectId),
  ]
  return tasks.trigger<TTask>(taskId, payload, { ...options, tags })
}
