export enum GenerationPromptStyle {
  ConsistentArtStyle = 'consistent art style',
}

export enum GenerationPromptCopy {
  MaskedCenterTile =
    'Edit only the masked center tile so it becomes a seamless continuation of the surrounding neighbor context.',
  MidjourneyGreyFill = 'Fill grey space seamlessly to match surrounding edges --q 2',
  MidjourneyUpscale =
    'Preserve exact structure, composition, and layout. Do not change any shapes, objects, or positioning. Only enhance resolution, sharpness, and fine details. Isometric view with seamless tileable edges matching on all sides. --stylize 0 --q 2',
  StabilityUpscale = 'upscale maintaining the same style, high quality, detailed, sharp',
}

export enum CreativityPromptLevel {
  VeryConservative =
    'VERY CONSERVATIVE - preserve exact colors, textures, and details. Only increase resolution with minimal interpretation. Do not add or change any visual elements.',
  Conservative =
    'CONSERVATIVE - maintain original style and colors closely. Subtle enhancement of existing details only. Preserve all visual elements as they are.',
  Balanced =
    'BALANCED - enhance existing details and textures while keeping the original style. May add subtle refinements to existing elements.',
  Creative =
    'CREATIVE - freely enhance details, textures, and lighting. Add richness to existing elements while maintaining overall structure and composition.',
  MaximumFreedom =
    'MAXIMUM FREEDOM - full creative liberty on details, textures, lighting, and fidelity. Add rich details and enhancements freely. Only preserve the core structure and composition.',
}

export const CREATIVITY_PROMPT_PREFIX = 'CREATIVITY LEVEL:'
