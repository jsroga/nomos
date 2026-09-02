/**
 * Payload contracts for the storyteller tasks. Each task's type derives from
 * its schema, so the shape is declared once and cannot drift.
 */
import { z } from 'zod'
import { OWNED_PAYLOAD_SHAPE } from '@/shared/jobs/submission-nonce'
import { ownedElsewhere } from '@/shared/jobs/payload-schema'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import { ApiframeVideoModel } from '@/shared/ai/constants/apiframe'
import type { StoryboardVideoLook } from '@/shared/ai/storyboard-video-env'

/** An image provider's credentials, as a route resolves them. */
const providerConfigSchema = z.object({
  provider: z.nativeEnum(ImageGenProvider),
  apiKey: z.string().min(1),
  modelId: z.string().optional(),
})

export const uploadAssetPayloadSchema = z.object({
  ...OWNED_PAYLOAD_SHAPE,
  assetId: z.string().min(1),
  /** A filename under the project's assets directory, e.g. `asset_123.glb`. */
  modelFilename: z.string().min(1),
})

export type UploadAssetPayload = z.infer<typeof uploadAssetPayloadSchema>

export const generateStoryboardPayloadSchema = z.object({
  ...OWNED_PAYLOAD_SHAPE,
  beatId: z.string().min(1),
  prompt: z.string(),
  providerConfig: providerConfigSchema,
})

export type GenerateStoryboardPayload = z.infer<typeof generateStoryboardPayloadSchema>

export const generatePortraitPayloadSchema = z.object({
  ...OWNED_PAYLOAD_SHAPE,
  prompt: z.string(),
  characterId: z.string().optional(),
  apiKey: z.string().min(1),
})

export type GeneratePortraitPayload = z.infer<typeof generatePortraitPayloadSchema>

export const selectPortraitVariantPayloadSchema = z.object({
  ...OWNED_PAYLOAD_SHAPE,
  characterId: z.string().min(1),
  gridImageUrl: z.string().min(1),
  variantIndex: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
})

export type SelectPortraitVariantPayload = z.infer<typeof selectPortraitVariantPayloadSchema>

export const generatePosterPayloadSchema = z.object({
  ...OWNED_PAYLOAD_SHAPE,
  episodeId: z.string().min(1),
  apiKey: z.string().min(1),
  extraPrompt: z.string().optional(),
  worldDesc: z.string().optional(),
  overview: z.string().optional(),
  prompt: z.string().optional(),
})

export type GeneratePosterPayload = z.infer<typeof generatePosterPayloadSchema>

export const generateEpisodePosterPayloadSchema = z.object({
  ...OWNED_PAYLOAD_SHAPE,
  episodeId: z.string().min(1),
  prompt: z.string(),
  providerConfig: z.object({
    apiKey: z.string().min(1),
    modelId: z.string().optional(),
  }),
})

export type GenerateEpisodePosterPayload = z.infer<typeof generateEpisodePosterPayloadSchema>

export const generateMoodboardPayloadSchema = z.object({
  ...OWNED_PAYLOAD_SHAPE,
  prompts: z.array(z.string()).optional(),
  promptIndex: z.number().optional(),
  worldDesc: z.string().optional(),
  overview: z.string().optional(),
  replaceIndex: z.number().optional(),
  styleReferenceUrl: z.string().optional(),
  providerConfig: providerConfigSchema,
})

export type GenerateMoodboardPayload = z.infer<typeof generateMoodboardPayloadSchema>

export const generateCombinedStoryboardPayloadSchema = z.object({
  ...OWNED_PAYLOAD_SHAPE,
  episodeId: z.string().min(1),
  beats: z.array(
    z.object({
      logline: z.string(),
      visualHook: z.string().optional(),
      imagePrompt: z.string().optional(),
      imageUrl: z.string().optional(),
    })
  ),
  model: z.nativeEnum(ApiframeVideoModel).optional(),
  look: ownedElsewhere<StoryboardVideoLook>().optional(),
})

export type GenerateCombinedStoryboardPayload = z.infer<
  typeof generateCombinedStoryboardPayloadSchema
>
