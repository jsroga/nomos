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

export interface GenerationModeDef {
  id: GenerationMode
  name: string
  hint: string
  camera: GenerationCamera
  /** Composition + medium fragment injected into every tile prompt for this mode. */
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
    name: 'Pixel art',
    hint: 'Ziarnista grafika jak w Drova albo starych RPG',
    camera: GenerationCamera.Isometric45,
    promptFragment:
      'hand-drawn 2D pixel art, limited palette, hard pixel edges, no anti-aliasing, no blur, grim dark fantasy mood',
    negatives: ['smooth gradients', 'anti-aliasing', 'photorealism', 'brush texture'],
    allowsUpscale: true,
    allowsFidelityEnhance: false,
    upscaleStrategy: UpscaleStrategy.NearestNeighbour,
  },
  {
    id: GenerationMode.PaintedIsometric,
    name: 'Disco Elysium',
    hint: 'Malowana izometria, widoczny pędzel',
    camera: GenerationCamera.Isometric45,
    promptFragment:
      'hand-painted oil texture, visible brushwork, muted desaturated palette, soft overcast light, painterly edges',
    negatives: ['pixel art', 'flat vector', 'cel shading', 'photorealism'],
    allowsUpscale: true,
    allowsFidelityEnhance: true,
    upscaleStrategy: UpscaleStrategy.Topaz,
  },
  {
    id: GenerationMode.AnimeLineart,
    name: 'Anime i komiks',
    hint: 'Czysta kreska, płaskie kolory',
    camera: GenerationCamera.EyeLevel,
    promptFragment:
      'clean ink linework, flat cel-shaded colour fills, hard shadow shapes, anime background art, no brush texture, no gradients',
    negatives: ['oil paint', 'brushwork', 'photorealism', 'pixel art'],
    allowsUpscale: true,
    allowsFidelityEnhance: true,
    upscaleStrategy: UpscaleStrategy.Topaz,
  },
  {
    id: GenerationMode.WorldMap,
    name: 'Mapa świata',
    hint: 'Kontynent z góry, teren i nazwy, jak mapa Westeros',
    camera: GenerationCamera.TopDown90,
    promptFragment:
      'cartographic relief map seen from directly above, continent scale, shaded terrain with forests, mountain ranges, rivers and coastline, atlas-like clarity, no perspective, no buildings visible individually',
    negatives: ['isometric', 'close-up', 'characters', 'buildings in perspective'],
    allowsUpscale: true,
    allowsFidelityEnhance: false,
    upscaleStrategy: UpscaleStrategy.Topaz,
  },
  {
    id: GenerationMode.TopDownLocation,
    name: 'Mapa miejsca',
    hint: 'Jedno miejsce z bliska, prosto z góry',
    camera: GenerationCamera.TopDown90,
    promptFragment:
      'single location seen from directly above at close range, realistic material texture on stone, timber, water and moss, individual furniture and objects readable, even diffuse lighting, no perspective distortion, no camera tilt',
    negatives: ['isometric', 'tilted camera', 'brushwork', 'grid overlay', 'map legend'],
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
