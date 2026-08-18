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

import { DEFAULT_STYLE_CONTEXT } from '@/shared/data/constants/style-presets'
import {
  CREATIVITY_PROMPT_PREFIX,
  CreativityPromptLevel,
  FollowUpApiframeAvoid,
  FollowUpApiframeCopy,
  GenerationPromptCopy,
  GenerationPromptStyle,
} from '@/shared/data/server/constants/generation-prompts'
import { StringSeparator } from '@/shared/data/constants/protocol'

export interface TilePromptLayers {
  tileDescription: string
  masterPrompt?: string | null
  modePromptFragment?: string | null
  styleContext?: string | null
}

/**
 * Joins layers, dropping any layer already contained in an earlier one — the
 * master prompt is seeded from the mode picker and can carry the mode fragment
 * verbatim, and a repeated clause is read as emphasis by the image models.
 */
function joinPromptParts(parts: Array<string | undefined | null>): string {
  const kept: string[] = []
  for (const raw of parts) {
    const part = raw?.trim() ?? ''
    if (part.length === 0) continue
    if (kept.some(previous => previous.includes(part))) continue
    kept.push(part)
  }
  return kept.join(' ')
}

export function tileDescriptionDirective(description: string): string | undefined {
  const trimmed = description.trim()
  if (trimmed.length === 0) return undefined
  return `${GenerationPromptCopy.TileDescriptionDirectivePrefix} ${trimmed}${GenerationPromptCopy.TileDescriptionDirectiveSuffix}`
}

function withTileDescriptionDirective(description: string, body: string): string {
  const directive = tileDescriptionDirective(description)
  if (!directive) return body
  return `${directive}${StringSeparator.DoubleNewline}${body}`
}

export function composeFirstTilePrompt(layers: TilePromptLayers): string {
  const styleContext = layers.styleContext?.trim() || DEFAULT_STYLE_CONTEXT
  const modeFragment = layers.modePromptFragment?.trim() ?? ''
  // The mode fragment states the camera; only fall back to overhead without one.
  const subject = modeFragment
    ? GenerationPromptCopy.FirstTileCroppedFragment
    : `${GenerationPromptCopy.FirstTileOverheadPrefix} ${GenerationPromptCopy.FirstTileCroppedFragment}`
  return withTileDescriptionDirective(
    layers.tileDescription,
    joinPromptParts([
      subject,
      layers.masterPrompt,
      GenerationPromptCopy.FirstTileFrameFill,
      modeFragment,
      styleContext,
    ]),
  )
}

export function composeFollowUpPrompt(layers: TilePromptLayers): string {
  const styleContext = layers.styleContext?.trim() || DEFAULT_STYLE_CONTEXT
  return withTileDescriptionDirective(
    layers.tileDescription,
    joinPromptParts([
      FollowUpApiframeCopy.PackedWorld,
      layers.masterPrompt,
      layers.modePromptFragment,
      styleContext,
      FollowUpApiframeCopy.PackedKeepNeighbors,
      FollowUpApiframeCopy.MatchContract,
    ]),
  )
}

function followUpAvoidLine(modeNegatives?: string[]): string {
  const avoided = [...Object.values(FollowUpApiframeAvoid), ...(modeNegatives ?? [])]
  return `${GenerationPromptCopy.FollowUpAvoidPrefix} ${avoided.join(StringSeparator.CommaSpace)}`
}

/** Apiframe follow-up — packed neighbor canvas with a grey hole, not a grey-1024 inpaint. */
export function composeApiframeFollowUpPrompt(
  layers: TilePromptLayers,
  modeNegatives?: string[],
): string {
  const styleContext = layers.styleContext?.trim() || DEFAULT_STYLE_CONTEXT
  return withTileDescriptionDirective(
    layers.tileDescription,
    joinPromptParts([
      FollowUpApiframeCopy.PackedWorld,
      layers.masterPrompt,
      layers.modePromptFragment,
      styleContext,
      FollowUpApiframeCopy.PackedKeepNeighbors,
      FollowUpApiframeCopy.MatchContract,
      followUpAvoidLine(modeNegatives),
    ]),
  )
}

export function tilePromptLayersFrom(input: {
  prompt: string
  masterPrompt?: string | null
  modePromptFragment?: string | null
  styleContext?: string | null
}): TilePromptLayers {
  return {
    tileDescription: input.prompt,
    masterPrompt: input.masterPrompt,
    modePromptFragment: input.modePromptFragment,
    styleContext: input.styleContext,
  }
}

export const GENERATION_PROMPTS = {
  /** First tile - no neighbors, full creative generation. */
  FIRST_TILE: {
    GEMINI: (layers: TilePromptLayers) => composeFirstTilePrompt(layers),

    MIDJOURNEY: (layers: TilePromptLayers) => composeFirstTilePrompt(layers),

    OPENAI: (layers: TilePromptLayers) => composeFirstTilePrompt(layers),

    STABILITY: (layers: TilePromptLayers) => composeFirstTilePrompt(layers),
  },

  /** Follow-up tile - has neighbors, must match edges */
  FOLLOW_UP: {
    /** Master template for inpainting follow-up tiles */
    MASTER: (layers: TilePromptLayers) =>
      withTileDescriptionDirective(
        layers.tileDescription,
        joinPromptParts([
          GenerationPromptCopy.FollowUpInpaintGraySquare,
          layers.masterPrompt,
          layers.modePromptFragment,
          layers.styleContext,
          GenerationPromptStyle.ConsistentArtStyle,
          GenerationPromptCopy.FollowUpNoBorders,
        ]),
      ),

    GEMINI: (layers: TilePromptLayers) =>
      withTileDescriptionDirective(
        layers.tileDescription,
        joinPromptParts([
          GenerationPromptCopy.FollowUpInpaintMagenta,
          layers.masterPrompt,
          layers.modePromptFragment,
          layers.styleContext,
          GenerationPromptCopy.FollowUpGeminiConstraints,
        ]),
      ),

    GEMINI_MASKED: (_layers?: TilePromptLayers) => GenerationPromptCopy.MaskedCenterTile,

    GEMINI_EDGE_GUIDED: (layers: TilePromptLayers, edgeLabels: string[]) => {
      const edgeList = edgeLabels.join(StringSeparator.CommaSpace)
      return withTileDescriptionDirective(
        layers.tileDescription,
        joinPromptParts([
          GenerationPromptCopy.FollowUpContinueNeighborWorld,
          layers.masterPrompt,
          layers.modePromptFragment,
          layers.styleContext,
          `The image MUST blend with its neighbors. Edge strips of adjacent images (${edgeList}) are provided. Edges must visually continue from these neighbor edges with matching colors, lines, shapes, and lighting. Do not add borders or frames.`,
        ]),
      )
    },

    MIDJOURNEY: (layers: TilePromptLayers) => composeFollowUpPrompt(layers),

    OPENAI: (layers: TilePromptLayers) =>
      withTileDescriptionDirective(
        layers.tileDescription,
        joinPromptParts([
          GenerationPromptCopy.FollowUpFillMatchEdges,
          layers.masterPrompt,
          layers.modePromptFragment,
          layers.styleContext,
        ]),
      ),

    STABILITY: (layers: TilePromptLayers) =>
      withTileDescriptionDirective(
        layers.tileDescription,
        joinPromptParts([
          GenerationPromptCopy.FollowUpFillMatchEdges,
          layers.masterPrompt,
          layers.modePromptFragment,
          layers.styleContext,
        ]),
      ),
  },
} as const

export const UPSCALE_PROMPTS = {
  /** Gemini Step 1 - initial upscale with style preservation */
  GEMINI_STEP1: (prompt: string, creativityPrompt: string, styleRefHint: string = '') =>
    `Upscale this image to be higher resolution with updated fidelity and significantly more details. ${creativityPrompt}. Maintain the exact same style, colors, and composition. ${prompt}${styleRefHint}`,

  /** Midjourney/LegNext Step 2 - structure-preserving upscale */
  MIDJOURNEY: GenerationPromptCopy.MidjourneyUpscale,

  STABILITY: GenerationPromptCopy.StabilityUpscale,
} as const

export const FIDELITY_PROMPTS = {
  /** Gemini fidelity enhancement */
  GEMINI: (stylePrompt: string, creativityPrompt: string, styleRefHint: string = '') =>
    `${stylePrompt}\n\nApply this artistic style to the image while maintaining the exact same composition, subject matter, and structure. Enhance the visual fidelity and add artistic detail according to the style description above. ${creativityPrompt} Ensure each object has a clear, natural-looking shape definition suitable for 3D conversion, especially for characters and people.${styleRefHint}`,
} as const

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
