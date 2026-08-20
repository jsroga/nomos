import { z } from 'zod'

export const BeatCastExtractSchema = z.object({
  names: z
    .array(z.string())
    .describe('Roster character names visibly present in the beat. Empty if none.'),
})

export type BeatCastExtract = z.infer<typeof BeatCastExtractSchema>
