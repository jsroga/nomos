/**
 * Interior Designer Prompts
 *
 * Centralized prompts for the interior designer module.
 */

// ============================================================================
// TEXTURE STYLE MODIFIERS
// ============================================================================

export type TextureStyle = 'painterly' | 'realistic' | 'sketch' | 'decay' | 'metallic' | 'organic'

/**
 * Style modifiers for texture generation
 * Used to enhance base prompts with style-specific keywords
 */
export const TEXTURE_STYLES: Record<TextureStyle, string> = {
  painterly:
    'oil painting style, impasto brushwork, expressive texture, disco elysium nuance, artistic, detailed',
  realistic: 'photorealistic, 8k, raw photo, highly detailed texture, pbr material',
  sketch:
    'architectural sketch style, blueprint aesthetics, white lines on blue, hand drawn, technical drawing',
  decay: 'post-apocalyptic, worn, grime, cracked, dirty, weathered, ruins aesthetic',
  metallic:
    'brushed metal, chrome, steel, industrial, reflective surface, high polish, sci-fi material',
  organic:
    'natural moss, overgrown, lush vegetation, living texture, nature reclaiming, earthy, verdant',
}

// ============================================================================
// AI SYSTEM PROMPTS
// ============================================================================

/**
 * System prompt for GPT-4 texture prompt refinement
 * Used to enhance user prompts into Stable Diffusion optimized prompts
 */
export const TEXTURE_REFINEMENT_SYSTEM_PROMPT = `You are a Texture Artist specializing in PBR materials for video games. 
Rewrite the user's raw prompt into a detailed Stable Diffusion prompt.
- Focus on visual description (color, wear, surface detail).
- Use keywords like "8k", "pbr", "highly detailed".
- Do NOT add conversational text. Return ONLY the prompt.`

/**
 * Build a complete texture prompt with style modifiers
 */
export function buildTexturePrompt(basePrompt: string, style: TextureStyle): string {
  const styleModifiers = TEXTURE_STYLES[style]
  return `${basePrompt}, ${styleModifiers}`
}
