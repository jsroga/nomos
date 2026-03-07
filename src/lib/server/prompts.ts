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

import { DEFAULT_STYLE_CONTEXT } from '@/config/style-presets'

/** Full style phrase for first tile: "Isometric painted world, " + (project style or default). */
function getFirstTileStylePhrase(styleContext?: string | null): string {
  return `Isometric painted world, ${styleContext ?? DEFAULT_STYLE_CONTEXT}`
}

export const GENERATION_PROMPTS = {
  /** First tile - no neighbors, full creative generation. styleContext from project settings (preset or default). */
  FIRST_TILE: {
    GEMINI: (prompt: string, styleContext?: string | null) =>
      `Generate an isometric tile image: ${prompt}. ${getFirstTileStylePhrase(styleContext)} The image should be 512x512 pixels, isometric perspective, suitable for a tile-based game world. Detailed, vibrant colors.`,

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
      `Inpaint the central gray square to seamlessly connect with the surrounding edge context. Fill the gray area with: ${prompt}. Maintain ${styleInfo}, consistent art style. Ensure continuous lines, consistent isometric perspective, and matching lighting. Do not generate borders or frames.`,

    GEMINI: (prompt: string, styleInfo: string = 'consistent art style') =>
      `Inpaint the central gray square to seamlessly connect with the surrounding edge context. Fill the gray area with: ${prompt}. Ensure continuous lines, consistent perspective (Isometric), and matching lighting. Do not generate borders or frames.`,

    MIDJOURNEY: (prompt: string, styleInfo: string) =>
      `Inpaint the central gray square to seamlessly connect with the surrounding edge context. Fill the gray area with: ${prompt}. Maintain ${styleInfo}, consistent art style. Ensure continuous lines, consistent isometric perspective, and matching lighting. Do not generate borders or frames. --stylize 0 --q 2`,

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
  MIDJOURNEY:
    'Preserve exact structure, composition, and layout. Do not change any shapes, objects, or positioning. Only enhance resolution, sharpness, and fine details. Isometric view with seamless tileable edges matching on all sides. --stylize 0 --q 2',

  STABILITY: 'upscale maintaining the same style, high quality, detailed, sharp',
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
    hint =
      'VERY CONSERVATIVE - preserve exact colors, textures, and details. Only increase resolution with minimal interpretation. Do not add or change any visual elements.'
  } else if (creativity <= 0.4) {
    hint =
      'CONSERVATIVE - maintain original style and colors closely. Subtle enhancement of existing details only. Preserve all visual elements as they are.'
  } else if (creativity <= 0.6) {
    hint =
      'BALANCED - enhance existing details and textures while keeping the original style. May add subtle refinements to existing elements.'
  } else if (creativity <= 0.8) {
    hint =
      'CREATIVE - freely enhance details, textures, and lighting. Add richness to existing elements while maintaining overall structure and composition.'
  } else {
    hint =
      'MAXIMUM FREEDOM - full creative liberty on details, textures, lighting, and fidelity. Add rich details and enhancements freely. Only preserve the core structure and composition.'
  }

  return `CREATIVITY LEVEL: ${level}/100. ${hint}`
}

/**
 * Get creativity prompt specifically for edge-matching generation
 */
function getGenerationCreativityPrompt(creativity: number): string {
  const level = Math.round(creativity * 100)
  let hint: string

  if (creativity <= 0.2) {
    hint =
      'VERY CONSERVATIVE - propagate existing patterns from edges exactly. Do not add new elements.'
  } else if (creativity <= 0.4) {
    hint = 'CONSERVATIVE - closely match surrounding style and patterns. Minimal interpretation.'
  } else if (creativity <= 0.6) {
    hint = 'BALANCED - match edges while adding appropriate detail consistent with style.'
  } else if (creativity <= 0.8) {
    hint = 'CREATIVE - match edges but freely enhance with rich details and textures.'
  } else {
    hint = 'MAXIMUM FREEDOM - match edge connections but add maximum detail and richness.'
  }

  return `CREATIVITY: ${level}/100. ${hint}`
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
