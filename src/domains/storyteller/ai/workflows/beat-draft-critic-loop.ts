import '@/shared/data/server-guard'
import { createStep, createWorkflow } from '@mastra/core/workflows'
import {
  activeBeatDraftCriticRoles,
  canonTextForCriticRole,
} from './beat-draft-critic-roles'
import { authorCanonText } from './beat-draft-author-canon'
import type { BeatDraftContext, BeatDraftDeps } from './beat-draft-deps-types'
import {
  beatDraftCriticLoopInputSchema,
  beatDraftCriticLoopOutputSchema,
} from './beat-draft-step-schemas'
import { emitRunTrace, RunTraceEventType } from '../../../../shared/agent-kernel/run-trace'
import {
  BEAT_DRAFT_CRITIQUE_JOIN,
  BEAT_DRAFT_NO_FINDINGS,
  BeatDraftCriticName,
  BeatDraftStepDescription,
  BeatDraftStepId,
  CriticReviseMax,
} from './constants/beat-draft-workflow'

export function isBeatDraftCritiquesClean(skipCritics: boolean, critiques: string): boolean {
  if (skipCritics) return true
  const chunks = critiques.split(BEAT_DRAFT_CRITIQUE_JOIN)
  return chunks.every(chunk => chunk.includes(BEAT_DRAFT_NO_FINDINGS))
}

export function isCriticLoopDone(output: {
  skipCritics: boolean
  needsWriterPass?: boolean
  attempt?: number
}): boolean {
  const attempt = output.attempt ?? 0
  if (attempt < 1) return false
  return output.skipCritics || !output.needsWriterPass || attempt >= CriticReviseMax.Value
}

export function createBeatDraftCriticLoop(deps: BeatDraftDeps) {
  const criticByRole: Record<
    BeatDraftCriticName,
    (draft: string, canon: string) => Promise<string>
  > = {
    [BeatDraftCriticName.Continuity]: deps.critiqueContinuity,
    [BeatDraftCriticName.Prose]: deps.critiqueProse,
    [BeatDraftCriticName.Stakes]: deps.critiqueStakes,
    [BeatDraftCriticName.Dialogue]: deps.critiqueDialogue,
  }

  const critiqueStep = createStep({
    id: BeatDraftStepId.Critique,
    description: BeatDraftStepDescription.Critique,
    inputSchema: beatDraftCriticLoopInputSchema,
    outputSchema: beatDraftCriticLoopOutputSchema,
    execute: async ({ inputData }) => {
      const attempt = (inputData.attempt ?? 0) + 1
      if (inputData.skipCritics) {
        return {
          ...inputData,
          critiques: inputData.lintReport,
          attempt,
          needsWriterPass: false,
        }
      }
      const roles = activeBeatDraftCriticRoles()
      for (const role of roles) {
        emitRunTrace({
          type: RunTraceEventType.RoleDispatch,
          stepId: BeatDraftStepId.Critique,
          role,
        })
      }
      const reports = await Promise.all(
        roles.map(role =>
          criticByRole[role](
            inputData.draft,
            canonTextForCriticRole(role, inputData.canon, inputData.characters)
          )
        )
      )
      emitRunTrace({
        type: RunTraceEventType.RoleResult,
        stepId: BeatDraftStepId.Critique,
        role: BeatDraftStepId.Critique,
      })
      const critiques = reports.join(BEAT_DRAFT_CRITIQUE_JOIN)
      const clean = isBeatDraftCritiquesClean(false, critiques)
      return {
        ...inputData,
        critiques,
        attempt,
        needsWriterPass: !clean && attempt <= CriticReviseMax.Value,
      }
    },
  })

  const writerLoopStep = createStep({
    id: BeatDraftStepId.WriterLoopRevise,
    description: BeatDraftStepDescription.WriterLoopRevise,
    inputSchema: beatDraftCriticLoopOutputSchema,
    outputSchema: beatDraftCriticLoopOutputSchema,
    execute: async ({ inputData }) => {
      if (!inputData.needsWriterPass || inputData.skipCritics) return inputData
      const ctx: BeatDraftContext = {
        projectId: inputData.projectId,
        episodeId: inputData.episodeId,
        brief: inputData.brief,
        characters: inputData.characters,
      }
      const draft = await deps.reviseBeat(
        ctx,
        authorCanonText(inputData.canon, inputData.characters),
        inputData.draft,
        inputData.critiques,
      )
      return { ...inputData, draft }
    },
  })

  return createWorkflow({
    id: BeatDraftStepId.CriticLoop,
    description: BeatDraftStepDescription.CriticLoop,
    inputSchema: beatDraftCriticLoopInputSchema,
    outputSchema: beatDraftCriticLoopOutputSchema,
  })
    .then(critiqueStep)
    .then(writerLoopStep)
    .commit()
}
