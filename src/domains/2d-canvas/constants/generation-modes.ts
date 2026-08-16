export enum GenerationMode {
  PixelArt = 'pixel-art',
  PaintedIsometric = 'painted-isometric',
  AnimeLineart = 'anime-lineart',
  WorldMap = 'world-map',
  TopDownLocation = 'top-down-location',
}

export enum GenerationCamera {
  Isometric45 = 'isometric-45',
  TopDown90 = 'top-down-90',
  EyeLevel = 'eye-level',
}

export enum UpscaleStrategy {
  Topaz = 'topaz',
  NearestNeighbour = 'nearest-neighbour',
}

export enum GenerationModeName {
  PixelArt = 'Pixel art',
  PaintedIsometric = 'Disco Elysium',
  AnimeLineart = 'Anime and comics',
  WorldMap = 'World map',
  TopDownLocation = 'Location map',
}

export enum GenerationModeHint {
  PixelArt = 'Low-res pixel grid, isometric, grim fantasy',
  PaintedIsometric = 'Oil-painted isometric, muted and grimy',
  AnimeLineart = 'Ink linework, flat cel shading, eye level',
  WorldMap = 'Continent-scale relief map, straight down',
  TopDownLocation = 'One location up close, straight down',
}

export interface GenerationModeDef {
  id: GenerationMode
  name: string
  hint: string
  camera: GenerationCamera
  /**
   * Camera + medium fragment injected into every tile prompt for this mode.
   * States the camera first — nothing else in the composed prompt does.
   * Exclusions belong in `negatives`, not here: Midjourney reads "no X" as X.
   */
  promptFragment: string
  /** Extra Midjourney negatives on top of the shared base list. */
  negatives: string[]
  /** Postprocessing capabilities. */
  allowsUpscale: boolean
  allowsFidelityEnhance: boolean
  upscaleStrategy: UpscaleStrategy
}

export const DEFAULT_GENERATION_MODE = GenerationMode.PaintedIsometric

export const GENERATION_MODES: GenerationModeDef[] = [
  {
    id: GenerationMode.PixelArt,
    name: GenerationModeName.PixelArt,
    hint: GenerationModeHint.PixelArt,
    camera: GenerationCamera.Isometric45,
    promptFragment:
      'three-quarter isometric camera at a 45-degree angle, hand-drawn 2D pixel art on a strict low-resolution pixel grid, limited indexed palette of roughly thirty-two colours, ordered dithering for shading, single-pixel hard contour outlines, chunky readable silhouettes, grim dark fantasy mood',
    negatives: [
      'smooth gradients',
      'anti-aliasing',
      'photorealism',
      'brush texture',
      'blur',
      'soft shading',
    ],
    allowsUpscale: true,
    allowsFidelityEnhance: false,
    upscaleStrategy: UpscaleStrategy.NearestNeighbour,
  },
  {
    id: GenerationMode.PaintedIsometric,
    name: GenerationModeName.PaintedIsometric,
    hint: GenerationModeHint.PaintedIsometric,
    camera: GenerationCamera.Isometric45,
    promptFragment:
      'three-quarter isometric camera at a 45-degree angle, hand-painted in oil on canvas, visible directional brushwork and impasto ridges, muted desaturated palette of ochre, slate and umber, soft overcast key light with long diffuse shadows, painterly edges that dissolve into shadow, gritty lived-in surfaces',
    negatives: ['pixel art', 'flat vector', 'cel shading', 'photorealism'],
    allowsUpscale: true,
    allowsFidelityEnhance: true,
    upscaleStrategy: UpscaleStrategy.Topaz,
  },
  {
    id: GenerationMode.AnimeLineart,
    name: GenerationModeName.AnimeLineart,
    hint: GenerationModeHint.AnimeLineart,
    camera: GenerationCamera.EyeLevel,
    promptFragment:
      'eye-level camera at standing height, clean uniform ink linework with confident tapered strokes, flat cel-shaded colour fills, two-tone hard-edged shadow shapes, crisp rim highlights, high-key anime background art with clear separation between foreground, midground and distance',
    negatives: [
      'oil paint',
      'brushwork',
      'photorealism',
      'pixel art',
      'brush texture',
      'soft gradients',
    ],
    allowsUpscale: true,
    allowsFidelityEnhance: true,
    upscaleStrategy: UpscaleStrategy.Topaz,
  },
  {
    id: GenerationMode.WorldMap,
    name: GenerationModeName.WorldMap,
    hint: GenerationModeHint.WorldMap,
    camera: GenerationCamera.TopDown90,
    promptFragment:
      'orthographic camera pointing straight down, cartographic relief map at continent scale, hillshaded terrain with forest canopy, mountain ranges, river networks, inland lakes and a clearly drawn coastline, restrained atlas colour ramp from lowland green to alpine grey, faint parchment grain, uniform legibility across the whole sheet',
    negatives: [
      'isometric',
      'close-up',
      'characters',
      'buildings in perspective',
      'individual buildings',
      'oblique perspective',
    ],
    allowsUpscale: true,
    allowsFidelityEnhance: false,
    upscaleStrategy: UpscaleStrategy.Topaz,
  },
  {
    id: GenerationMode.TopDownLocation,
    name: GenerationModeName.TopDownLocation,
    hint: GenerationModeHint.TopDownLocation,
    camera: GenerationCamera.TopDown90,
    promptFragment:
      'orthographic camera pointing straight down at close range, a single location surveyed from directly above, physically accurate material response on wet stone, weathered timber, standing water and moss, individual furniture, crates and floor debris legible as separate objects, even diffuse daylight with soft contact shadows, consistent scale across the whole frame',
    negatives: [
      'isometric',
      'tilted camera',
      'brushwork',
      'grid overlay',
      'map legend',
      'perspective distortion',
    ],
    allowsUpscale: true,
    allowsFidelityEnhance: true,
    upscaleStrategy: UpscaleStrategy.Topaz,
  },
]

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
  throw new Error('GENERATION_MODES catalog is empty')
}
