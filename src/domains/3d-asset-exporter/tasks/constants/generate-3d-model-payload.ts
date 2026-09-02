/** The generate-3d-model payload contract. The task's types derive from it. */
import { z } from 'zod'
import { OWNED_PAYLOAD_SHAPE } from '@/shared/jobs/submission-nonce'
import { ModelProvider, MeshyTopology } from '@/shared/data/constants/protocol'

export const generate3dModelPayloadSchema = z.object({
  ...OWNED_PAYLOAD_SHAPE,
  assetId: z.string().min(1),
  imageUrl: z.string().min(1),
  provider: z.nativeEnum(ModelProvider),
  apiKey: z.string().min(1),
  targetPolycount: z.number().optional(),
  topology: z.nativeEnum(MeshyTopology).optional(),
})

export type Generate3dModelPayload = z.infer<typeof generate3dModelPayloadSchema>
