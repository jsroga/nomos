import '@/shared/data/server-guard'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import type { Mastra } from '@mastra/core/mastra'
import { hourLoopExperimentScorerIds } from '@/shared/agent-kernel/scorers/hour-loop-default-scorers'
import {
  HourDatasetVersion,
  HourExperimentCopy,
  HourExperimentName,
  HourExperimentStatus,
  HourLoopBudget,
  HourLoopTarget,
  HourRunNoteFile,
  LiveQualityDatasetName,
  MastraToolHostKey,
  QualityImproverError,
  QualityImproverToolDescription,
  QualityImproverToolId,
  HOUR_LOOP_EDITOR_STATUS,
} from './constants'
import { CreditHaltKind, classifyOpenRouterCreditError, sleepMs } from './credits'

const LIST_PAGE = 50

function isMastraInstance(value: unknown): value is Mastra {
  if (typeof value !== 'object' || value === null) return false
  if (
    !(MastraToolHostKey.Datasets in value) ||
    !(MastraToolHostKey.GetEditor in value) ||
    !(MastraToolHostKey.GetWorkspace in value)
  ) {
    return false
  }
  return (
    typeof value[MastraToolHostKey.GetEditor] === 'function' &&
    typeof value[MastraToolHostKey.GetWorkspace] === 'function'
  )
}

function requireMastra(context: { mastra?: unknown }): Mastra {
  if (!isMastraInstance(context.mastra)) throw new Error(QualityImproverError.MastraMissing)
  return context.mastra
}

async function requireLiveDataset(mastra: Mastra) {
  const listed = await mastra.datasets.list({
    perPage: LIST_PAGE,
    filters: { name: LiveQualityDatasetName.StorytellerLiveQuality },
  })
  const existing = listed.datasets.find(
    row => row.name === LiveQualityDatasetName.StorytellerLiveQuality,
  )
  if (!existing) throw new Error(QualityImproverError.DatasetNotFound)
  return mastra.datasets.get({ id: existing.id })
}

export const pinLiveDatasetTool = createTool({
  id: QualityImproverToolId.PinLiveDataset,
  description: QualityImproverToolDescription.PinLiveDataset,
  inputSchema: z.object({}),
  outputSchema: z.object({
    datasetId: z.string(),
    version: z.number(),
    name: z.string(),
  }),
  execute: async (_input, context) => {
    const mastra = requireMastra(context)
    const dataset = await requireLiveDataset(mastra)
    const details = await dataset.getDetails()
    const versions = await dataset.listVersions({ page: 0, perPage: 1 })
    const latest = versions.versions[0]
    return {
      datasetId: details.id,
      version: latest?.version ?? HourDatasetVersion.Fallback,
      name: details.name,
    }
  },
})

export const startLiveExperimentTool = createTool({
  id: QualityImproverToolId.StartLiveExperiment,
  description: QualityImproverToolDescription.StartLiveExperiment,
  inputSchema: z.object({
    version: z.number().optional(),
    name: z.string().optional(),
  }),
  outputSchema: z.object({
    experimentId: z.string(),
    status: z.string(),
    halted: z.string().optional(),
    worst: z.array(
      z.object({
        itemId: z.string(),
        scorerId: z.string(),
        score: z.number().nullable(),
        reason: z.string(),
      }),
    ),
  }),
  execute: async (input, context) => {
    const mastra = requireMastra(context)
    const dataset = await requireLiveDataset(mastra)
    const run = async () =>
      dataset.startExperiment({
        name: input.name ?? HourExperimentName.Live,
        description: HourExperimentCopy.LiveDescription,
        targetType: HourLoopTarget.AgentType,
        targetId: HourLoopTarget.GrrmAuthor,
        scorers: hourLoopExperimentScorerIds(),
        version: input.version,
        maxConcurrency: 1,
      })
    try {
      const summary = await run()
      const worst = summary.results.flatMap(item =>
        item.scores.map(score => ({
          itemId: item.itemId,
          scorerId: score.scorerId,
          score: score.score,
          reason: score.reason ?? '',
        })),
      )
      return {
        experimentId: summary.experimentId,
        status: summary.status,
        worst,
      }
    } catch (error: unknown) {
      const kind = classifyOpenRouterCreditError(error)
      if (kind === CreditHaltKind.InFlight) {
        await sleepMs(HourLoopBudget.InFlightRetryAfterMs)
        try {
          const retry = await run()
          return {
            experimentId: retry.experimentId,
            status: retry.status,
            worst: retry.results.flatMap(item =>
              item.scores.map(score => ({
                itemId: item.itemId,
                scorerId: score.scorerId,
                score: score.score,
                reason: score.reason ?? '',
              })),
            ),
          }
        } catch (retryError: unknown) {
          return {
            experimentId: '',
            status: HourExperimentStatus.Failed,
            halted: classifyOpenRouterCreditError(retryError),
            worst: [],
          }
        }
      }
      if (kind === CreditHaltKind.Insufficient) {
        return { experimentId: '', status: HourExperimentStatus.Failed, halted: kind, worst: [] }
      }
      throw error
    }
  },
})

export const readExperimentRowsTool = createTool({
  id: QualityImproverToolId.ReadExperimentRows,
  description: QualityImproverToolDescription.ReadExperimentRows,
  inputSchema: z.object({
    experimentId: z.string().min(1),
  }),
  outputSchema: z.object({
    rows: z.array(
      z.object({
        itemId: z.string(),
        traceId: z.string().nullable(),
      }),
    ),
  }),
  execute: async (input, context) => {
    const mastra = requireMastra(context)
    const dataset = await requireLiveDataset(mastra)
    const listed = await dataset.listExperimentResults({
      experimentId: input.experimentId,
      page: 0,
      perPage: LIST_PAGE,
    })
    return {
      rows: listed.results.map(result => ({
        itemId: result.itemId,
        traceId: result.traceId,
      })),
    }
  },
})

export const writeEditorDraftTool = createTool({
  id: QualityImproverToolId.WriteEditorDraft,
  description: QualityImproverToolDescription.WriteEditorDraft,
  inputSchema: z.object({
    agentId: z.string().min(1),
    instructions: z.string().min(1),
  }),
  outputSchema: z.object({
    agentId: z.string(),
    status: z.string(),
  }),
  execute: async (input, context) => {
    const mastra = requireMastra(context)
    const editor = mastra.getEditor()
    if (!editor) throw new Error(QualityImproverError.EditorMissing)
    await editor.agent.update({
      id: input.agentId,
      instructions: input.instructions,
      status: HOUR_LOOP_EDITOR_STATUS,
    })
    return { agentId: input.agentId, status: HOUR_LOOP_EDITOR_STATUS }
  },
})

export const writeRunNoteTool = createTool({
  id: QualityImproverToolId.WriteRunNote,
  description: QualityImproverToolDescription.WriteRunNote,
  inputSchema: z.object({
    note: z.string().min(1),
  }),
  outputSchema: z.object({
    path: z.string(),
  }),
  execute: async (input, context) => {
    const mastra = requireMastra(context)
    const filesystem = mastra.getWorkspace()?.filesystem
    if (!filesystem) throw new Error(QualityImproverError.WorkspaceMissing)
    await filesystem.writeFile(HourRunNoteFile.Name, input.note)
    return { path: HourRunNoteFile.Name }
  },
})
