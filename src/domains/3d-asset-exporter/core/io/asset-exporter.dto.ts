import { z } from 'zod'

export const assetExporterJobStatusSchema = z.object({
  runId: z.string(),
  status: z.string(),
})

export type AssetExporterJobStatus = z.infer<typeof assetExporterJobStatusSchema>
