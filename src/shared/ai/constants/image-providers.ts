/**
 * Cross-domain image generation / upscale provider wire ids.
 */

export enum ImageGenProvider {
  Gemini = 'gemini',
  Midjourney = 'midjourney',
  OpenAi = 'openai',
  Stability = 'stability',
  Replicate = 'replicate',
  /** Follow-up tiles via Apiframe → xAI Grok Imagine. */
  Grok = 'grok',
  NanoBanana = 'nano-banana',
  Apiframe = 'apiframe',
}
