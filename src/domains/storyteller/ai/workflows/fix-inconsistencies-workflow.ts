/**
 * fix-inconsistencies-workflow — project-wide continuity scan with HITL apply/discard.
 *
 *   assemble-canon
 *     → structural-scan (setup/payoff ID join)
 *     → agentic-scan (structuredOutput critic, chunked per episode)
 *     → propose-fixes (structuredOutput patches)
 *     → editorial-verdict (SUSPENDS: apply all / discard all)
 *     → apply-fixes (cascade editor, or no-op on discard)
 *
 * Dependencies are injected via `createFixInconsistenciesWorkflow(deps)` so
 * mechanics tests can drive suspend/resume without LLM or a database.
 */

import '@/shared/data/server-guard'
import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import {
  ConsistencyFixItemSchema,
  ContinuityAffectedKind,
  ContinuityFindingSchema,
  ContinuityFindingSeverity,
  ContinuityFindingType,
  type ContinuityFinding,
} from './fix-inconsistencies-schema'
import {
  AssembledCanonSchema,
  FIX_INCONSISTENCIES_WORKFLOW_ID,
  FIX_INCONSISTENCIES_VERDICT_STEP,
  SkippedFindingSchema,
  fixInconsistenciesInputSchema,
  fixInconsistenciesOutputSchema,
} from './fix-inconsistencies-contract'
import {
  FIX_INCONSISTENCIES_APPLIED_MESSAGE,
  FIX_INCONSISTENCIES_DISCARDED_MESSAGE,
  FIX_INCONSISTENCIES_EMPTY_MESSAGE,
  FIX_INCONSISTENCIES_NO_FINDINGS_MESSAGE,
  FIX_INCONSISTENCIES_STRUCTURAL_ID_PREFIX,
  FIX_INCONSISTENCIES_SUSPEND_REASON,
  FIX_INCONSISTENCIES_WORKFLOW_DESCRIPTION,
  FixInconsistenciesFieldPath,
  FixInconsistenciesSkipReason,
  FixInconsistenciesStepId,
  FixInconsistenciesVerdictAction,
} from './constants/fix-inconsistencies-workflow'
import { collapseFixesByFieldPath, isPatchableFinding } from './collapse-consistency-fixes'
import type { FixInconsistenciesDeps } from './fix-inconsistencies-deps-types'
import { ConsistencyIssueType, ConsistencyUnknownLocation } from '@/domains/storyteller/services/constants/consistency-issues'
import type { ContinuityIssue } from '@/domains/storyteller/services/consistency-service'

export {
  fixInconsistenciesInputSchema,
  fixInconsistenciesOutputSchema,
  FIX_INCONSISTENCIES_WORKFLOW_ID,
  FIX_INCONSISTENCIES_VERDICT_STEP,
}

const assembledSchema = fixInconsistenciesInputSchema.extend({
  empty: z.boolean(),
  canon: AssembledCanonSchema,
})

const afterStructuralSchema = assembledSchema.extend({
  structuralFindings: z.array(ContinuityFindingSchema),
})

const afterScanSchema = afterStructuralSchema.extend({
  findings: z.array(ContinuityFindingSchema),
})

const afterProposeSchema = afterScanSchema.extend({
  fixes: z.array(ConsistencyFixItemSchema),
  skipped: z.array(SkippedFindingSchema),
})

const afterVerdictSchema = afterProposeSchema.extend({
  action: z.nativeEnum(FixInconsistenciesVerdictAction),
})

function issueTypeToFindingType(type: ContinuityIssue['type']): ContinuityFindingType {
  if (type === ConsistencyIssueType.MissingPayoff) return ContinuityFindingType.MissingPayoff
  if (type === ConsistencyIssueType.OrphanedSetup) return ContinuityFindingType.OrphanedSetup
  return ContinuityFindingType.PlotLogic
}

function issueSeverityToFinding(
  severity: ContinuityIssue['severity']
): ContinuityFindingSeverity {
  if (severity === ContinuityFindingSeverity.Critical) return ContinuityFindingSeverity.Critical
  if (severity === ContinuityFindingSeverity.Major) return ContinuityFindingSeverity.Major
  return ContinuityFindingSeverity.Minor
}

function structuralIssueToFinding(issue: ContinuityIssue, index: number): ContinuityFinding {
  const location =
    issue.location ||
    issue.affectedElements[0] ||
    `${FIX_INCONSISTENCIES_STRUCTURAL_ID_PREFIX}${index}`
  return {
    id: `${FIX_INCONSISTENCIES_STRUCTURAL_ID_PREFIX}${index}-${location}`,
    type: issueTypeToFindingType(issue.type),
    severity: issueSeverityToFinding(issue.severity),
    quote: issue.description,
    why: issue.suggestion ?? issue.description,
    affected: [
      {
        kind: ContinuityAffectedKind.Beat,
        id: location || ConsistencyUnknownLocation.Unknown,
        fieldPath: FixInconsistenciesFieldPath.SetupsPayoffs,
      },
    ],
    patchable: false,
  }
}

export function createFixInconsistenciesWorkflow(deps: FixInconsistenciesDeps) {
  const assembleStep = createStep({
    id: FixInconsistenciesStepId.AssembleCanon,
    inputSchema: fixInconsistenciesInputSchema,
    outputSchema: assembledSchema,
    execute: async ({ inputData }) => {
      const canon = await deps.assembleCanon(inputData.projectId)
      return { ...inputData, empty: canon.empty, canon }
    },
  })

  const structuralStep = createStep({
    id: FixInconsistenciesStepId.StructuralScan,
    inputSchema: assembledSchema,
    outputSchema: afterStructuralSchema,
    execute: async ({ inputData }) => {
      if (inputData.empty) {
        return { ...inputData, structuralFindings: [] }
      }
      const { issues } = await deps.structuralScan(inputData.projectId)
      return {
        ...inputData,
        structuralFindings: issues.map((issue, index) => structuralIssueToFinding(issue, index)),
      }
    },
  })

  const scanStep = createStep({
    id: FixInconsistenciesStepId.AgenticScan,
    inputSchema: afterStructuralSchema,
    outputSchema: afterScanSchema,
    execute: async ({ inputData }) => {
      if (inputData.empty) {
        return { ...inputData, findings: inputData.structuralFindings }
      }
      const agentic = await deps.agenticScan(inputData.canon)
      return { ...inputData, findings: [...inputData.structuralFindings, ...agentic] }
    },
  })

  const proposeStep = createStep({
    id: FixInconsistenciesStepId.ProposeFixes,
    inputSchema: afterScanSchema,
    outputSchema: afterProposeSchema,
    execute: async ({ inputData }) => {
      const patchable = inputData.findings.filter(isPatchableFinding)
      const unpatchableSkipped = inputData.findings
        .filter(finding => !isPatchableFinding(finding))
        .map(finding => ({
          findingId: finding.id,
          reason: FixInconsistenciesSkipReason.Unpatchable,
          detail: finding.why,
        }))

      if (inputData.empty || patchable.length === 0) {
        return { ...inputData, fixes: [], skipped: unpatchableSkipped }
      }

      const proposed = await deps.proposeFixes(inputData.canon, patchable)
      const collapsed = collapseFixesByFieldPath(proposed, inputData.findings)
      const locked = deps.filterLocked(inputData.canon, inputData.findings, collapsed.fixes)
      return {
        ...inputData,
        fixes: locked.fixes,
        skipped: [...unpatchableSkipped, ...collapsed.skipped, ...locked.skipped],
      }
    },
  })

  const verdictStep = createStep({
    id: FIX_INCONSISTENCIES_VERDICT_STEP,
    inputSchema: afterProposeSchema,
    suspendSchema: z.object({
      reason: z.string(),
      empty: z.boolean(),
      findings: z.array(ContinuityFindingSchema),
      fixes: z.array(ConsistencyFixItemSchema),
      skipped: z.array(SkippedFindingSchema),
    }),
    resumeSchema: z.object({
      action: z.nativeEnum(FixInconsistenciesVerdictAction),
    }),
    outputSchema: afterVerdictSchema,
    execute: async ({ inputData, resumeData, suspend }) => {
      if (inputData.empty || (inputData.findings.length === 0 && inputData.fixes.length === 0)) {
        return { ...inputData, action: FixInconsistenciesVerdictAction.Discard }
      }
      if (!resumeData) {
        if (inputData.autoApprove) {
          return { ...inputData, action: FixInconsistenciesVerdictAction.Apply }
        }
        return await suspend({
          reason: FIX_INCONSISTENCIES_SUSPEND_REASON,
          empty: inputData.empty,
          findings: inputData.findings,
          fixes: inputData.fixes,
          skipped: inputData.skipped,
        })
      }
      return { ...inputData, action: resumeData.action }
    },
  })

  const applyStep = createStep({
    id: FixInconsistenciesStepId.ApplyFixes,
    inputSchema: afterVerdictSchema,
    outputSchema: fixInconsistenciesOutputSchema,
    execute: async ({ inputData }) => {
      if (inputData.empty) {
        return {
          empty: true,
          findings: [],
          fixes: [],
          skipped: inputData.skipped,
          appliedCount: 0,
          discarded: true,
          message: FIX_INCONSISTENCIES_EMPTY_MESSAGE,
        }
      }
      if (inputData.action === FixInconsistenciesVerdictAction.Discard) {
        return {
          empty: false,
          findings: inputData.findings,
          fixes: inputData.fixes,
          skipped: inputData.skipped,
          appliedCount: 0,
          discarded: true,
          message:
            inputData.findings.length === 0
              ? FIX_INCONSISTENCIES_NO_FINDINGS_MESSAGE
              : FIX_INCONSISTENCIES_DISCARDED_MESSAGE,
        }
      }
      if (inputData.fixes.length === 0) {
        return {
          empty: false,
          findings: inputData.findings,
          fixes: [],
          skipped: inputData.skipped,
          appliedCount: 0,
          discarded: false,
          message: FIX_INCONSISTENCIES_NO_FINDINGS_MESSAGE,
        }
      }
      const applied = await deps.applyFixes(inputData.projectId, inputData.fixes)
      return {
        empty: false,
        findings: inputData.findings,
        fixes: inputData.fixes,
        skipped: inputData.skipped,
        appliedCount: applied.appliedCount,
        undoId: applied.undoId,
        discarded: false,
        errors: applied.errors,
        message: FIX_INCONSISTENCIES_APPLIED_MESSAGE,
      }
    },
  })

  return createWorkflow({
    id: FIX_INCONSISTENCIES_WORKFLOW_ID,
    description: FIX_INCONSISTENCIES_WORKFLOW_DESCRIPTION,
    inputSchema: fixInconsistenciesInputSchema,
    outputSchema: fixInconsistenciesOutputSchema,
  })
    .then(assembleStep)
    .then(structuralStep)
    .then(scanStep)
    .then(proposeStep)
    .then(verdictStep)
    .then(applyStep)
    .commit()
}
