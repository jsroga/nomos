export {
  DEFAULT_STYLE_CONTEXT,
  STYLE_PRESETS,
  type StylePreset,
} from '../constants/style-presets'
import { DEFAULT_STYLE_CONTEXT, STYLE_PRESETS, type StylePreset } from '../constants/style-presets'

export const STYLE_PRESETS_MAP: Record<string, StylePreset> = STYLE_PRESETS.reduce<
  Record<string, StylePreset>
>(
  (acc, preset) => {
    acc[preset.id] = preset
    return acc
  },
  {}
)

export function resolveStyleContext(project: {
  stylePreset?: string | null
}): string {
  if (project.stylePreset) {
    const preset = STYLE_PRESETS_MAP[project.stylePreset]
    if (preset?.styleContext) return preset.styleContext
  }
  return DEFAULT_STYLE_CONTEXT
}

export function resolveStyleReferenceUrls(project: {
  stylePreset?: string | null
  styleReferenceUrls?: unknown
}): string[] {
  if (project.stylePreset) {
    const preset = STYLE_PRESETS_MAP[project.stylePreset]
    if (preset && preset.urls.length > 0) {
      return preset.urls
    }
  }
  if (Array.isArray(project.styleReferenceUrls)) {
    return project.styleReferenceUrls.filter((url): url is string => typeof url === 'string')
  }
  return []
}
