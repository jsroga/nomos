/**
 * Adapter: the pure `ConsistencyService` behind the legacy consistency-check
 * API shape (`ConsistencyCheckResult` with inconsistencies/fixes).
 *
 * Replaces the deleted LLM judge (`agents/judges/ConsistencyAgent`). The API
 * route's request/response contract is unchanged; `fixes` is empty because
 * the deterministic service diagnoses without proposing rewrites (the same
 * diagnose-don't-rewrite rule the critics follow).
 */

import 'server-only'
import { randomUUID } from 'node:crypto'
import {
  ConsistencyCheckKind,
  runConsistencyCheck as runServiceConsistencyCheck,
  type ContinuityIssue,
} from './consistency-service'
import type {
  ConsistencyCheckResult,
  ConsistencyType,
  Inconsistency,
} from '@/domains/storyteller/core/types/consistency-types'
import {
  AffectedElementKind,
  ConsistencyCheckAdapterCopy,
  LegacyConsistencyType,
  legacyConsistencyTypeForIssue,
  parseContinuityIssueWireType,
} from '@/domains/storyteller/services/constants/consistency-check-adapter'

/** Legacy StoryContext-ish input the API route passes through. */
export interface ConsistencyCheckContext {
  projectId: string
  episodeId?: string
  beatIds?: string[]
}

function toInconsistency(issue: ContinuityIssue): Inconsistency {
  const issueType = parseContinuityIssueWireType(issue.type)
  const consistencyType: ConsistencyType = issueType
    ? legacyConsistencyTypeForIssue(issueType)
    : LegacyConsistencyType.PlotLogic

  return {
    id: randomUUID(),
    type: consistencyType,
    severity: issue.severity,
    description: issue.suggestion
      ? `${issue.description} (suggestion: ${issue.suggestion})`
      : issue.description,
    affectedElements: issue.affectedElements.map(elementId => ({
      type: AffectedElementKind.Beat,
      id: elementId,
      fieldPath: issue.location,
    })),
  }
}

/**
 * Run a consistency check with the legacy API result shape.
 * Drop-in replacement for the deleted judge's `runConsistencyCheck`.
 */
export async function runConsistencyCheck(
  context: ConsistencyCheckContext,
  _triggerAction?: unknown
): Promise<ConsistencyCheckResult> {
  const result = await runServiceConsistencyCheck({
    projectId: context.projectId,
    episodeId: context.episodeId,
    beatIds: context.beatIds,
    checkTypes: [ConsistencyCheckKind.ALL],
  })

  if (!result.ok) {
    return {
      id: randomUUID(),
      timestamp: Date.now(),
      inconsistencies: [],
      fixes: [],
      summary: `Consistency check failed: ${result.error}`,
      totalAffected: 0,
    }
  }

  const inconsistencies = result.value.issues.map(toInconsistency)
  return {
    id: randomUUID(),
    timestamp: Date.now(),
    inconsistencies,
    // Deterministic diagnosis only — no generated rewrites.
    fixes: [],
    summary:
      inconsistencies.length === 0
        ? ConsistencyCheckAdapterCopy.NoIssuesFound
        : `Found ${inconsistencies.length} issue(s).`,
    totalAffected: inconsistencies.length,
  }
}
