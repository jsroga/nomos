// Experiment definitions for A/B testing
// Add new experiments here with their variants and weights

export interface ExperimentConfig {
  variants: string[]
  weights: number[]
  description?: string
}

export const experiments: Record<string, ExperimentConfig> = {
  // Landing page headline experiments - BRUTAL EDITION
  'landing-hero-headline': {
    variants: [
      'fuzzy_text', // Canvas-based pixel distortion
      'text_pressure', // Weight/width changes on cursor proximity
      'magic_mushrooms', // BUILD MAGIC WORLD ON MAGIC MUSHROOMS
      'that_bleed', // BUILD WORLDS THAT BLEED
    ],
    weights: [0.25, 0.25, 0.25, 0.25],
    description: 'Test advanced text effects for the main headline',
  },

  'landing-cta-copy': {
    variants: [
      'get_started', // Get Started Free
      'initialize', // INITIALIZE SYSTEM
      'enter_void', // ENTER THE VOID
      'unleash', // UNLEASH CHAOS
    ],
    weights: [0.25, 0.25, 0.25, 0.25],
    description: 'Test CTA button copy',
  },

  'landing-style': {
    variants: ['brutal', 'sleek'],
    weights: [0.5, 0.5],
    description: 'Test brutal vs sleek UI style',
  },

  'landing-testimonials': {
    variants: ['show', 'hide'],
    weights: [0.5, 0.5],
    description: 'Test impact of testimonials section',
  },
}

// Headline copy for each variant
export const headlineVariants: Record<string, { line1: string; line2: string; line3: string }> = {
  magic_mushrooms: {
    line1: 'BUILD',
    line2: 'MAGIC WORLD',
    line3: 'ON MAGIC MUSHROOMS',
  },
  that_bleed: {
    line1: 'BUILD',
    line2: 'WORLDS',
    line3: 'THAT BLEED',
  },
  no_limits: {
    line1: 'BUILD',
    line2: 'WORLDS',
    line3: 'WITHOUT LIMITS',
  },
  destroy_create: {
    line1: 'DESTROY',
    line2: 'CREATE',
    line3: 'DOMINATE',
  },
}

// CTA copy for each variant
export const ctaVariants: Record<string, string> = {
  get_started: 'Get Started Free',
  initialize: 'INITIALIZE SYSTEM',
  enter_void: 'ENTER THE VOID',
  unleash: 'UNLEASH CHAOS',
}

// Helper to get experiment variant names
export function getExperimentVariants(experimentId: string): string[] {
  return experiments[experimentId]?.variants || []
}
