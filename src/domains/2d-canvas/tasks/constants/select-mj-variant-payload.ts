/** The select-mj-variant payload contract. Crops one quadrant of a 2x2 grid. */
import { z } from 'zod'
import { OWNED_PAYLOAD_SHAPE } from '@/shared/jobs/submission-nonce'

/** The four quadrants of a Midjourney grid, in reading order. */
export const MJ_VARIANT_INDEXES = [1, 2, 3, 4] as const

export const selectMjVariantPayloadSchema = z.object({
  ...OWNED_PAYLOAD_SHAPE,
  tileId: z.string().min(1),
  gridImageUrl: z.string().min(1),
  variantIndex: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
})

export type SelectMjVariantPayload = z.infer<typeof selectMjVariantPayloadSchema>
