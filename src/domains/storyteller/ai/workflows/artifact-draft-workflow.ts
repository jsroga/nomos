/**
 * artifact-draft-workflow — light pipeline for bible / character / premise.
 *
 * assemble → deterministic check → 1–2 matrix critics in parallel →
 * suspend (Accept / Reject) → persist on Accept when checks are clean.
 * No Humanizer. No Law of Motion. No commit_beat.
 */

import '@/shared/data/server-guard'
import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { ArtifactKind } from '@/domains/storyteller/core/types/artifact-kind'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { FindingSchema, ProblemType } from '@/domains/storyteller/core/types/finding'
import { artifactDraftMatrixRow } from '@/domains/storyteller/ai/workflows/artifact-draft-matrix'
import type { ArtifactDraftDeps } from '@/domains/storyteller/ai/workflows/artifact-draft-deps-types'
import {
  ARTIFACT_DRAFT_VERDICT_STEP_ID,
  ARTIFACT_DRAFT_WORKFLOW_ID,
  ArtifactDraftVerdictAction,
  artifactDraftInputSchema,
  artifactDraftOutputSchema,
} from '@/domains/storyteller/ai/workflows/artifact-draft-contract'
import { emitRunTrace, RunTraceEventType } from '@/shared/agent-kernel/run-trace'

export {
  ARTIFACT_DRAFT_VERDICT_STEP_ID,
  ARTIFACT_DRAFT_WORKFLOW_ID,
  ArtifactDraftVerdictAction,
  artifactDraftInputSchema,
  artifactDraftOutputSchema,
} from '@/domains/storyteller/ai/workflows/artifact-draft-contract'
export type {
  ArtifactDraftInput,
  ArtifactDraftOutput,
} from '@/domains/storyteller/ai/workflows/artifact-draft-contract'

export enum ArtifactDraftStepId {
  Assemble = 'assemble',
  DeterministicCheck = 'deterministic-check',
  Critique = 'critique',
  Persist = 'persist',
}

enum ArtifactDraftCopy {
  SuspendReason = 'Artifact draft ready — Accept to persist or Reject to discard.',
  Rejected = 'Artifact draft rejected — nothing persisted.',
  Blocked = 'Deterministic check failed — nothing persisted.',
  MissingMatrix = 'No artifact-draft matrix row for this kind/section.',
}

enum ArtifactDraftJoin {
  Critiques = '\n\n',
}

const CriticCap = 2

const assembledSchema = artifactDraftInputSchema.extend({
  canonText: z.string(),
  worldRules: z.array(z.string()),
})

const checkedSchema = assembledSchema.extend({
  findings: z.array(FindingSchema),
})

const critiquedSchema = checkedSchema.extend({
  critiques: z.string(),
})

const verdictSchema = critiquedSchema.extend({
  action: z.nativeEnum(ArtifactDraftVerdictAction),
})

function matrixScopes(kind: ArtifactKind, section?: BibleSection): readonly ProblemType[] {
  const row = artifactDraftMatrixRow(kind, section)
  if (!row) return [ProblemType.ChapterContinuity]
  return row.criticScopes.slice(0, CriticCap)
}

async function runMatrixCritics(
  deps: ArtifactDraftDeps,
  scopes: readonly ProblemType[],
  draft: string,
  canonText: string
): Promise<string> {
  for (const scope of scopes) {
    emitRunTrace({
      type: RunTraceEventType.RoleDispatch,
      stepId: ArtifactDraftStepId.Critique,
      role: scope,
    })
  }
  const reports = await Promise.all(
    scopes.map(scope => deps.critique(scope, draft, canonText))
  )
  emitRunTrace({
    type: RunTraceEventType.RoleResult,
    stepId: ArtifactDraftStepId.Critique,
    role: ArtifactDraftStepId.Critique,
  })
  return reports.join(ArtifactDraftJoin.Critiques)
}

export function createArtifactDraftWorkflow(deps: ArtifactDraftDeps) {
  const assembleStep = createStep({
    id: ArtifactDraftStepId.Assemble,
    inputSchema: artifactDraftInputSchema,
    outputSchema: assembledSchema,
    execute: async ({ inputData }) => {
      const assembled = await deps.assemble(inputData)
      return { ...inputData, ...assembled }
    },
  })

  const checkStep = createStep({
    id: ArtifactDraftStepId.DeterministicCheck,
    inputSchema: assembledSchema,
    outputSchema: checkedSchema,
    execute: async ({ inputData }) => {
      const findings = await deps.checkDeterministic(inputData)
      return { ...inputData, findings }
    },
  })

  const critiqueStep = createStep({
    id: ArtifactDraftStepId.Critique,
    inputSchema: checkedSchema,
    outputSchema: critiquedSchema,
    execute: async ({ inputData }) => {
      if (artifactDraftMatrixRow(inputData.kind, inputData.section) === undefined) {
        return { ...inputData, critiques: ArtifactDraftCopy.MissingMatrix }
      }
      const scopes = matrixScopes(inputData.kind, inputData.section)
      const critiques = await runMatrixCritics(
        deps,
        scopes,
        inputData.draft,
        inputData.canonText
      )
      return { ...inputData, critiques }
    },
  })

  const verdictStep = createStep({
    id: ARTIFACT_DRAFT_VERDICT_STEP_ID,
    inputSchema: critiquedSchema,
    suspendSchema: z.object({
      reason: z.string(),
      draft: z.string(),
      critiques: z.string(),
      findings: z.array(FindingSchema),
    }),
    resumeSchema: z.object({
      action: z.nativeEnum(ArtifactDraftVerdictAction),
    }),
    outputSchema: verdictSchema,
    execute: async ({ inputData, resumeData, suspend }) => {
      if (!resumeData) {
        return await suspend({
          reason: ArtifactDraftCopy.SuspendReason,
          draft: inputData.draft,
          critiques: inputData.critiques,
          findings: inputData.findings,
        })
      }
      return { ...inputData, action: resumeData.action }
    },
  })

  const persistStep = createStep({
    id: ArtifactDraftStepId.Persist,
    inputSchema: verdictSchema,
    outputSchema: artifactDraftOutputSchema,
    execute: async ({ inputData }) => {
      if (inputData.action === ArtifactDraftVerdictAction.Reject) {
        emitRunTrace({
          type: RunTraceEventType.GateDecision,
          stepId: ArtifactDraftStepId.Persist,
          detail: ArtifactDraftVerdictAction.Reject,
        })
        return {
          draft: inputData.draft,
          critiques: inputData.critiques,
          findings: inputData.findings,
          persisted: false,
          message: ArtifactDraftCopy.Rejected,
        }
      }
      if (inputData.findings.length > 0) {
        emitRunTrace({
          type: RunTraceEventType.GateDecision,
          stepId: ArtifactDraftStepId.Persist,
          detail: ArtifactDraftCopy.Blocked,
        })
        return {
          draft: inputData.draft,
          critiques: inputData.critiques,
          findings: inputData.findings,
          persisted: false,
          message: ArtifactDraftCopy.Blocked,
        }
      }
      const saved = await deps.persist(inputData)
      emitRunTrace({
        type: RunTraceEventType.PersistCommit,
        stepId: ArtifactDraftStepId.Persist,
      })
      return {
        draft: inputData.draft,
        critiques: inputData.critiques,
        findings: inputData.findings,
        persisted: saved.persisted,
        message: saved.message,
      }
    },
  })

  return createWorkflow({
    id: ARTIFACT_DRAFT_WORKFLOW_ID,
    description:
      'Assemble bible/character/premise context, run a deterministic check, 1–2 matrix critics, suspend for Accept/Reject, persist on Accept when checks are clean.',
    inputSchema: artifactDraftInputSchema,
    outputSchema: artifactDraftOutputSchema,
  })
    .then(assembleStep)
    .then(checkStep)
    .then(critiqueStep)
    .then(verdictStep)
    .then(persistStep)
    .commit()
}
