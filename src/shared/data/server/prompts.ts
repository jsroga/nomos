/**
 * Prompt Strategy Constants
 *
 * This file contains all prompt templates used across different AI providers
 * and functions (generate, upscale, enhance fidelity).
 *
 * PROMPT STRATEGY MATRIX:
 * | Function           | Provider   | Style Analysis        | Creativity      |
 * |:-------------------|:-----------|:----------------------|:----------------|
 * | Generate First     | All        | None                  | N/A             |
 * | Generate Follow-up | MJ/Gemini  | analyzeStyleWithSharp | creativityPrompt|
 * | Upscale            | All        | None                  | creativityPrompt|
 * | Enhance Fidelity   | Gemini     | None                  | creativityPrompt|
 */

// ============================================================================
// GENERATION PROMPTS
// ============================================================================

import { DEFAULT_STYLE_CONTEXT } from '@/shared/data/constants/style-presets'
import {
  CREATIVITY_PROMPT_PREFIX,
  CreativityPromptLevel,
  GenerationPromptCopy,
  GenerationPromptStyle,
} from '@/shared/data/server/constants/generation-prompts'
import { StringSeparator } from '@/shared/data/constants/protocol'

/** Full style phrase for first tile: "Isometric painted world, " + (project style or default). */
function getFirstTileStylePhrase(styleContext?: string | null): string {
  return `Isometric painted world, ${styleContext ?? DEFAULT_STYLE_CONTEXT}`
}

export const GENERATION_PROMPTS = {
  /** First tile - no neighbors, full creative generation (prompt text matches 34158c5). */
  FIRST_TILE: {
    GEMINI: (prompt: string, _styleContext?: string | null) =>
      `Generate an isometric tile image: ${prompt}. The image should be 512x512 pixels, isometric perspective, suitable for a tile-based game world. Style: painterly, detailed, vibrant colors.`,

    MIDJOURNEY: (prompt: string, styleContext?: string | null) =>
      `Isometric tile for a game world: ${prompt}. ${getFirstTileStylePhrase(styleContext)} 512x512, detailed, vibrant colors, seamless edges --v 6.1 --ar 1:1`,

    OPENAI: (prompt: string, styleContext?: string | null) =>
      `Isometric tile for a game world: ${prompt}. ${getFirstTileStylePhrase(styleContext)} 512x512, detailed.`,

    STABILITY: (prompt: string, styleContext?: string | null) =>
      `Isometric tile for a game world: ${prompt}. ${getFirstTileStylePhrase(styleContext)} Detailed, vibrant colors.`,
  },

  /** Follow-up tile - has neighbors, must match edges */
  FOLLOW_UP: {
    /** Master template for inpainting follow-up tiles */
    MASTER: (prompt: string, styleInfo: string) =>
      `Inpaint the central gray square to seamlessly connect with the surrounding edge context. Fill the gray area with: ${prompt}. Maintain ${styleInfo}, ${GenerationPromptStyle.ConsistentArtStyle}. Ensure continuous lines, consistent isometric perspective, and matching lighting. Do not generate borders or frames.`,

    GEMINI: (prompt: string, _styleInfo: string = GenerationPromptStyle.ConsistentArtStyle) =>
      `Inpaint the bright magenta/pink square in the center of this image. The magenta marks exactly where new content must go — replace ONLY the magenta pixels with: ${prompt}. The gray areas outside the magenta are unconstrained empty borders with no adjacent tiles — do not fill or alter them. The non-gray, non-magenta areas are neighboring tiles — seamlessly continue their colors, lines, and lighting at every edge where they touch the magenta area. Ensure continuous lines, consistent isometric perspective, and matching lighting. Do not alter any non-magenta pixels. Do not add borders or frames.`,

    GEMINI_MASKED: (_prompt?: string, _styleInfo: string = GenerationPromptStyle.ConsistentArtStyle) =>
      GenerationPromptCopy.MaskedCenterTile,

    GEMINI_EDGE_GUIDED: (prompt: string, edgeLabels: string[], styleContext?: string) => {
      const styleHint = styleContext ? ` ${styleContext}.` : ''
      const edgeList = edgeLabels.join(StringSeparator.CommaSpace)
      return `Generate a 512x512 isometric game tile: ${prompt}.${styleHint} The tile MUST seamlessly blend with its neighboring tiles. I am providing the edge strips of adjacent tiles (${edgeList}). Your generated tile's edges must visually continue from these neighbor edges with matching colors, lines, shapes, and lighting. Do not add borders or frames.`
    },

    MIDJOURNEY: (_prompt: string, _styleInfo: string) => GenerationPromptCopy.MidjourneyGreyFill,

    OPENAI: (prompt: string) =>
      `Fill seamlessly to match surrounding edges: ${prompt}. Maintain isometric perspective and consistent style.`,

    STABILITY: (prompt: string) =>
      `Fill seamlessly to match surrounding edges: ${prompt}. Maintain isometric perspective and consistent style.`,
  },
} as const

// ============================================================================
// UPSCALE PROMPTS
// ============================================================================

export const UPSCALE_PROMPTS = {
  /** Gemini Step 1 - initial upscale with style preservation */
  GEMINI_STEP1: (prompt: string, creativityPrompt: string, styleRefHint: string = '') =>
    `Upscale this image to be higher resolution with updated fidelity and significantly more details. ${creativityPrompt}. Maintain the exact same style, colors, and composition. ${prompt}${styleRefHint}`,

  /** Midjourney/LegNext Step 2 - structure-preserving upscale */
  MIDJOURNEY: GenerationPromptCopy.MidjourneyUpscale,

  STABILITY: GenerationPromptCopy.StabilityUpscale,
} as const

// ============================================================================
// FIDELITY ENHANCEMENT PROMPTS
// ============================================================================

export const FIDELITY_PROMPTS = {
  /** Gemini fidelity enhancement */
  GEMINI: (stylePrompt: string, creativityPrompt: string, styleRefHint: string = '') =>
    `${stylePrompt}\n\nApply this artistic style to the image while maintaining the exact same composition, subject matter, and structure. Enhance the visual fidelity and add artistic detail according to the style description above. ${creativityPrompt} Ensure each object has a clear, natural-looking shape definition suitable for 3D conversion, especially for characters and people.${styleRefHint}`,
} as const

// ============================================================================
// CREATIVITY PROMPTS
// ============================================================================

/**
 * Get creativity level prompt hint based on 0-1 slider value
 */
export function getCreativityPrompt(creativity: number): string {
  const level = Math.round(creativity * 100)
  let hint: string

  if (creativity <= 0.2) {
    hint = CreativityPromptLevel.VeryConservative
  } else if (creativity <= 0.4) {
    hint = CreativityPromptLevel.Conservative
  } else if (creativity <= 0.6) {
    hint = CreativityPromptLevel.Balanced
  } else if (creativity <= 0.8) {
    hint = CreativityPromptLevel.Creative
  } else {
    hint = CreativityPromptLevel.MaximumFreedom
  }

  return `${CREATIVITY_PROMPT_PREFIX} ${level}/100. ${hint}`
}

// ============================================================================
// MASK CONFIGURATIONS
// ============================================================================

export const MASK_CONFIG = {
  /** Full canvas mask for first tile generation */
  FULL_CANVAS: {
    width: 1024,
    height: 1024,
    points: [0, 0, 0, 1024, 1024, 1024, 1024, 0],
  },

  /** Center 512x512 mask for follow-up tile generation */
  CENTER_512: {
    width: 512,
    height: 512,
    points: [256, 256, 256, 768, 768, 768, 768, 256],
  },
} as const
