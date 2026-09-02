/** The upscale-tile payload contract. The task's types derive from it. */
import { z } from 'zod'
import { OWNED_PAYLOAD_SHAPE } from '@/shared/jobs/submission-nonce'
import { ownedElsewhere } from '@/shared/jobs/payload-schema'
import { UpscaleStrategy } from '../../constants/generation-modes'
import type { UpscaleProvider } from '../../core/upscale-provider-wire'
import type { ProviderConfig } from '../upscale-tile-providers'

export const upscaleTilePayloadSchema = z.object({
  ...OWNED_PAYLOAD_SHAPE,
  tileId: z.string().min(1),
  imageBase64: z.string().min(1),
  prompt: z.string(),
  creativity: z.number(),
  provider: ownedElsewhere<UpscaleProvider>(),
  providerConfig: ownedElsewhere<ProviderConfig>(),
  styleReferenceUrls: z.array(z.string()).optional(),
  upscaleStrategy: z.nativeEnum(UpscaleStrategy).optional(),
  geminiConfig: z.object({ apiKey: z.string(), model: z.string().optional() }).optional(),
})

export type UpscaleTilePayload = z.infer<typeof upscaleTilePayloadSchema>
