export interface StylePreset {
  id: string
  name: string
  description: string
  emoji: string
  color: string // hex accent color for card UI
  urls: string[] // Midjourney --sref URLs
}

/**
 * Predefined Midjourney style presets.
 *
 * To configure URLs for a preset, add Midjourney image URLs to the `urls` array.
 * Multiple URLs per preset are supported for style blending.
 *
 * Example:
 *   urls: ['https://s.mj.run/abc123', 'https://s.mj.run/def456']
 */
export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'neon-noir',
    name: 'Neon Noir',
    description: 'Your GPU called. It wants a raise.',
    emoji: '\u{1F30C}', // milky way
    color: '#7B2FBE',
    urls: [],
  },
  {
    id: 'goblin-baroque',
    name: 'Goblin Baroque',
    description: 'If a troll went to art school and peaked.',
    emoji: '\u{1F47A}', // goblin
    color: '#8B6914',
    urls: [],
  },
  {
    id: 'moss-and-ruin',
    name: 'Moss & Ruin',
    description: 'Nature won. Humanity left the chat.',
    emoji: '\u{1FAB4}', // potted plant
    color: '#2D6B4F',
    urls: [],
  },
  {
    id: 'celestial-ink',
    name: 'Celestial Ink',
    description: 'Ancient monks with telescopes. Enough said.',
    emoji: '\u{2728}', // sparkles
    color: '#1B3A5C',
    urls: [],
  },
  {
    id: 'bubblegum-brutalism',
    name: 'Bubblegum Brutalism',
    description: 'Soviet architecture had a cotton candy fever dream.',
    emoji: '\u{1F36C}', // candy
    color: '#D94F8E',
    urls: [],
  },
  {
    id: 'elder-rot',
    name: 'Elder Rot',
    description: 'Grandma\'s attic if grandma worshipped something unspeakable.',
    emoji: '\u{1F480}', // skull
    color: '#4A1A2E',
    urls: [],
  },
]

export const STYLE_PRESETS_MAP = Object.fromEntries(
  STYLE_PRESETS.map(p => [p.id, p])
) as Record<string, StylePreset>

/**
 * Resolves the effective style reference URLs for a project.
 * If a preset is selected, returns the preset's URLs.
 * Otherwise returns the custom URLs stored on the project.
 */
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
    return project.styleReferenceUrls as string[]
  }
  return []
}