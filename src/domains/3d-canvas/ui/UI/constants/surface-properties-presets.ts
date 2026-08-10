import type { SurfaceType } from '@/domains/3d-canvas/core/interior-types'
import type { TextureStyle } from '@/domains/3d-canvas/prompts'
import { SurfaceTypeValue } from '@/domains/3d-canvas/constants/terrain-defaults'

export const PROMPT_PRESETS: Record<SurfaceType, string[]> = {
  [SurfaceTypeValue.Grass]: [
    'Lush green grass field',
    'Wild meadow with wildflowers',
    'Tall swaying grass',
    'Short manicured lawn',
  ],
  [SurfaceTypeValue.Water]: [
    'Deep blue ocean',
    'Murky swamp water',
    'Clear pool water',
    'Frozen ice',
  ],
  [SurfaceTypeValue.Road]: [
    'Cracked asphalt',
    'Cobblestone street',
    'Dirt path',
    'Modern highway',
  ],
  [SurfaceTypeValue.Dirt]: [
    'Rich dark soil patch',
    'Dry cracked mud',
    'Forest floor with leaves',
    'Sandy loam',
  ],
  [SurfaceTypeValue.Pavement]: [
    'Concrete slabs',
    'Brick walkway',
    'Hexagon tiles',
    'Stone pavers',
  ],
  [SurfaceTypeValue.Mars]: [
    'Red dusty martian soil',
    'Alien rock formation',
    'Crater surface',
    'Rusty metal ground',
  ],
  [SurfaceTypeValue.Sand]: [
    'Golden beach sand dunes',
    'White desert dunes',
    'Wet compact sand',
    'Desert ripples',
  ],
  [SurfaceTypeValue.Rock]: [
    'Grey mountain rocks',
    'Volcanic basalt formation',
    'Smooth river stones',
    'Jagged cliff rocks',
  ],
  [SurfaceTypeValue.Wall]: [
    'Stone wall',
    'Brick wall',
    'Wooden fence',
    'Modern concrete wall',
  ],
}

export const MATERIAL_3D_PRESETS: Record<SurfaceType, string[]> = {
  [SurfaceTypeValue.Grass]: [
    'Dense grass patch with varied heights',
    'Wildflower meadow with tall grass',
    'Tropical tall grass field',
    'Short clipped lawn grass',
  ],
  [SurfaceTypeValue.Water]: [
    'Coral reef underwater scene',
    'Lily pads on water',
    'Ice sheet with cracks',
    'Seaweed bed',
  ],
  [SurfaceTypeValue.Road]: [
    'Broken asphalt chunks',
    'Cobblestone path section',
    'Wooden planks walkway',
    'Gravel path',
  ],
  [SurfaceTypeValue.Dirt]: [
    'Plowed field rows',
    'Muddy terrain with puddles',
    'Root covered forest floor',
    'Rocky soil patch',
  ],
  [SurfaceTypeValue.Pavement]: [
    'Cracked concrete tiles',
    'Mossy brick pathway',
    'Hexagonal stone tiles',
    'Marble floor section',
  ],
  [SurfaceTypeValue.Mars]: [
    'Martian rock outcrop',
    'Alien crystal formation',
    'Meteor impact crater',
    'Rusted debris field',
  ],
  [SurfaceTypeValue.Sand]: [
    'Sand dunes with ripples',
    'Beach with shells',
    'Desert oasis patch',
    'Quicksand pit',
  ],
  [SurfaceTypeValue.Rock]: [
    'Boulder cluster',
    'Volcanic rock formation',
    'Cliff face section',
    'Cave stalagmites',
  ],
  [SurfaceTypeValue.Wall]: [
    'Medieval stone wall',
    'Red brick wall',
    'Graffiti covered concrete',
    'Log cabin walls',
  ],
}

export enum TextureStyleLabel {
  Painterly = 'Painterly',
  Realistic = 'Realistic',
  Sketch = 'Sketch',
  Decay = 'Decay',
  Metallic = 'Metallic',
  Organic = 'Organic',
}

export const STYLE_OPTIONS: { value: TextureStyle; label: string }[] = [
  { value: 'painterly', label: TextureStyleLabel.Painterly },
  { value: 'realistic', label: TextureStyleLabel.Realistic },
  { value: 'sketch', label: TextureStyleLabel.Sketch },
  { value: 'decay', label: TextureStyleLabel.Decay },
  { value: 'metallic', label: TextureStyleLabel.Metallic },
  { value: 'organic', label: TextureStyleLabel.Organic },
]

export const getMaterialGenerationStageLabel = (
  stage: string | undefined,
  progress: number
): string => {
  switch (stage) {
    case 'preview':
      return `Generating mesh... ${progress}%`
    case 'refine':
      return `Adding textures... ${progress}%`
    case 'saving':
      return `Saving model... ${progress}%`
    case 'completed':
      return 'Complete!'
    default:
      return `Processing... ${progress}%`
  }
}
