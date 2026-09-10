import {
  DEFAULT_GENERATION_MODE,
  GENERATION_MODES,
  GenerationMode,
  GenerationModeCatalogError,
  type GenerationModeDef,
} from '../constants/generation-modes'

export {
  DEFAULT_GENERATION_MODE,
  GENERATION_MODES,
  GenerationCamera,
  GenerationMode,
  GenerationModeHint,
  GenerationModeName,
  UpscaleStrategy,
} from '../constants/generation-modes'
export type { GenerationModeDef } from '../constants/generation-modes'

const GENERATION_MODE_VALUES = new Set<string>(Object.values(GenerationMode))

export function resolveGenerationMode(value: unknown): GenerationMode {
  const raw = typeof value === 'string' ? value : null
  if (raw && GENERATION_MODE_VALUES.has(raw)) {
    for (const mode of Object.values(GenerationMode)) {
      if (mode === raw) return mode
    }
  }
  return DEFAULT_GENERATION_MODE
}

export function generationModeDef(id: GenerationMode): GenerationModeDef {
  for (const def of GENERATION_MODES) {
    if (def.id === id) return def
  }
  for (const def of GENERATION_MODES) {
    if (def.id === DEFAULT_GENERATION_MODE) return def
  }
  throw new Error(GenerationModeCatalogError.Empty)
}
