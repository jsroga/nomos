export interface StylePreset {
  id: string
  name: string
  description: string
  emoji: string
  color: string // hex accent color for card UI
  urls: string[] // Midjourney --sref URLs
  /** Replaces the default "painterly art style..." phrase in first-tile generation prompts. */
  styleContext: string
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
    styleContext:
      'pure isometric 3D game style like Disco Elysium or Fallout; neon noir aesthetic, high contrast, cinematic lighting, cyberpunk atmosphere, dark moody tones, vibrant neon accents.',
    urls: [
      'https://cdn.midjourney.com/e677f442-5617-4c88-9ada-567f8b3b15f0/0_1.png',
      'https://cdn.midjourney.com/d914b7f9-35a0-44e6-bdba-c9938bb33a63/0_3.png',
      'https://cdn.midjourney.com/07bd69de-36bd-41bf-8459-e128fc456395/0_1.png',
      'https://cdn.midjourney.com/9ceaf700-6548-465f-b678-43022315f6a1/0_1.png',
      'https://cdn.midjourney.com/1565bbad-680b-4cfd-b182-7c457efe1463/0_1.png',
      'https://cdn.midjourney.com/99275803-b489-49cb-a66c-0c24cd9ba23d/0_1.png',
    ],
  },
  {
    id: 'goblin-baroque',
    name: 'Goblin Baroque',
    description: 'If a troll went to art school and peaked.',
    emoji: '\u{1F47A}', // goblin
    color: '#8B6914',
    styleContext:
      'pure isometric 3D game style like Disco Elysium or Fallout; goblin baroque style, ornate and grotesque, rich earthy tones, dramatic chiaroscuro, fantasy oil painting aesthetic.',
    urls: [
      'https://cdn.midjourney.com/2d3169f0-a89d-4cb4-b1dd-e876753c5b1e/0_1.png',
      'https://cdn.midjourney.com/2a40bc28-aaec-4e2b-90d7-58d6ccd114e4/0_0.png',
      'https://cdn.midjourney.com/8416fa9c-867c-453c-9339-866a4ef9fe5d/0_0.png',
      'https://cdn.midjourney.com/edf46c9a-9c92-4775-a338-8a75b45ef1e5/0_0.png',
      'https://cdn.midjourney.com/1f58b325-e7be-48ed-a8d3-c661ac8fad0a/0_3.png',
    ],
  },
  {
    id: 'moss-and-ruin',
    name: 'Moss & Ruin',
    description: 'Nature won. Humanity left the chat.',
    emoji: '\u{1FAB4}', // potted plant
    color: '#2D6B4F',
    styleContext:
      'pure isometric 3D game style like Disco Elysium or Fallout; moss and ruin, overgrown post-nature, muted greens and stone, atmospheric decay, soft organic detail, hand-painted environmental art.',
    urls: [
      'https://cdn.midjourney.com/e677f442-5617-4c88-9ada-567f8b3b15f0/0_1.png',
      'https://cdn.midjourney.com/55f281a1-d4ee-4e37-bda0-198c6753f41c/0_2.png',
      'https://cdn.midjourney.com/7e7b0520-db67-4ba1-b2ed-15f572a0ef20/0_1.png',
      'https://cdn.midjourney.com/47b4cbbd-b8db-47f7-b6fd-f21e580d1dd3/0_2.png',
      'https://cdn.midjourney.com/8b1e7a70-6c72-45f8-bd05-3723b27c5064/0_2.png',
      'https://cdn.midjourney.com/8b1e7a70-6c72-45f8-bd05-3723b27c5064/0_1.png',
    ],
  },
  {
    id: 'celestial-ink',
    name: 'Celestial Ink',
    description: 'Ancient monks with telescopes. Enough said.',
    emoji: '\u{2728}', // sparkles
    color: '#1B3A5C',
    styleContext:
      'pure isometric 3D game style like Disco Elysium or Fallout; celestial ink style, ancient manuscript meets astronomy, deep blues and gold, delicate linework, ethereal atmospheric detail.',
    urls: [
      'https://cdn.midjourney.com/2ea02ad2-5a9d-4ebd-aaf7-2882d9534429/0_2.png',
      'https://cdn.midjourney.com/017d010e-d4e0-4fc2-8a75-87ac6fbaee7d/0_2.png',
      'https://cdn.midjourney.com/86498229-6f97-416c-976f-7855b493a5be/0_1.png',
      'https://cdn.midjourney.com/0145a5a2-a3eb-439a-b223-3e356c1abc08/0_2.png',
      'https://cdn.midjourney.com/b5913823-6a33-4346-b973-80eff7f7173c/0_1.png',
    ],
  },
  {
    id: 'bubblegum-brutalism',
    name: 'Bubblegum Brutalism',
    description: 'Soviet architecture had a cotton candy fever dream.',
    emoji: '\u{1F36C}', // candy
    color: '#D94F8E',
    styleContext:
      'pure isometric 3D game style like Disco Elysium or Fallout; bubblegum brutalism, pastel pinks and concrete grey, bold geometric shapes, playful yet stark, candy-colored harsh lighting.',
    urls: [
      'https://cdn.midjourney.com/d113211a-446f-4897-b6e9-f38fb83b33fb/0_3.png',
      'https://cdn.midjourney.com/cdc10981-6491-405f-8ec2-cbbfa3bfd8a1/0_1.png',
      'https://cdn.midjourney.com/f40902dd-4cd8-4fe0-aec9-41b9b234ab8e/0_3.png',
      'https://cdn.midjourney.com/40c8ea5c-eaa1-4827-9f98-42c26ffab5e6/0_3.png',
      'https://cdn.midjourney.com/b6e29df4-6017-4b68-8720-8eb675bb6eec/0_0.png',
    ],
  },
  {
    id: 'elder-rot',
    name: 'Elder Rot',
    description: 'Grandma\'s attic if grandma worshipped something unspeakable.',
    emoji: '\u{1F480}', // skull
    color: '#4A1A2E',
    styleContext:
      'pure isometric 3D game style like Disco Elysium or Fallout; elder rot aesthetic, gothic decay, deep burgundy and black, organic corruption, unsettling atmosphere, hand-painted horror detail.',
    urls: [
      'https://cdn.midjourney.com/d10ebf7a-3e68-4a44-91d7-45dbfc67f1ff/0_0.png',
      'https://cdn.midjourney.com/7e7b0520-db67-4ba1-b2ed-15f572a0ef20/0_1.png',
      'https://cdn.midjourney.com/b6e29df4-6017-4b68-8720-8eb675bb6eec/0_3.png',
      'https://cdn.midjourney.com/faa4ae8c-6302-4dc4-acd3-07fc254ca238/0_1.png',
      'https://cdn.midjourney.com/9bba3928-1e07-4cde-82d3-985575d9337c/0_3.png',
    ],
  },
]

export const STYLE_PRESETS_MAP = Object.fromEntries(
  STYLE_PRESETS.map(p => [p.id, p])
) as Record<string, StylePreset>

/** Default style phrase when no preset is selected (custom URLs or legacy). */
export const DEFAULT_STYLE_CONTEXT =
  'in the style of Disco Elysium, painterly art style with expressive brushwork, rich atmospheric detail, hand-painted aesthetic.'

/**
 * Resolves the style context phrase for first-tile prompts from project settings.
 * Used to replace the default "painterly art style..." with the selected preset's phrase.
 */
export function resolveStyleContext(project: {
  stylePreset?: string | null
}): string {
  if (project.stylePreset) {
    const preset = STYLE_PRESETS_MAP[project.stylePreset]
    if (preset?.styleContext) return preset.styleContext
  }
  return DEFAULT_STYLE_CONTEXT
}

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
