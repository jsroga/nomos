/**
 * Server-side feature flags. Opt-in only: a flag is on when its value is
 * exactly `true`. Every toggle is opt-in; there are no default-on env switches.
 *
 * Client flags must read `process.env.NEXT_PUBLIC_FF_*` as a literal so Next
 * can inline them; they cannot go through `isFeatureEnabled`.
 */
export enum FeatureFlag {
  StorytellerController = 'FF_STORYTELLER_CONTROLLER',
  StorytellerAutonomous = 'FF_STORYTELLER_AUTONOMOUS',
  LoopCreatorMastra = 'FF_LOOP_CREATOR_MASTRA',
  RemotePrompts = 'FF_REMOTE_PROMPTS',
  InternalDocs = 'FF_INTERNAL_DOCS',
  VoyageEmbeddings = 'FF_VOYAGE_EMBEDDINGS',
  CanvasGeminiUpscale = 'FF_CANVAS_GEMINI_UPSCALE',
}

export const FEATURE_FLAG_ON = 'true'

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return process.env[flag]?.trim().toLowerCase() === FEATURE_FLAG_ON
}
