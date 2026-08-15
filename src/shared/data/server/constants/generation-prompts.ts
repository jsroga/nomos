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
  FirstTileCroppedFragment =
    'rendered as a cropped fragment of a much larger continuous world.',
  FirstTileFrameFill =
    'The image fills the entire square frame from edge to edge. Objects are cut off by all four frame edges mid-shape. No sky, no horizon, no background, no empty corners.',
  FollowUpGreyCenter = 'Fill the grey center to continue the surrounding world:',
  FollowUpNoBorders = 'Ensure continuous lines and matching lighting. Do not generate borders or frames.',
  FollowUpGeminiConstraints =
    'The gray areas outside the magenta are unconstrained empty borders with no adjacent images — do not fill or alter them. The non-gray, non-magenta areas are neighboring images — continue their colors, lines, and lighting at every edge where they touch the magenta area. Ensure continuous lines and matching lighting. Do not alter any non-magenta pixels. Do not add borders or frames.',
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
