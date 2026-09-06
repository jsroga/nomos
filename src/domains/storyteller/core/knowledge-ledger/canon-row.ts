import { z } from 'zod'

export const KnowledgeLedgerCanonRowSchema = z.object({
  factText: z.string().min(1),
  authorTruth: z.boolean(),
  knownBy: z.array(z.string()),
  revoked: z.boolean().optional(),
})

export type KnowledgeLedgerCanonRow = z.infer<typeof KnowledgeLedgerCanonRowSchema>
