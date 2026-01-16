/**
 * Visual Concept Tools
 *
 * Generate detailed visual descriptions, image prompts, and storyboard concepts.
 * Helps translate narrative beats into visual language for:
 * - Storyboard generation
 * - Mood/tone communication
 * - Cinematographic planning
 * - AI image generation prompts
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { WritersRoomState, BeatCard } from '../graph/state'

// Visual style presets
const STYLE_PRESETS = {
  'cinematic-dramatic': {
    lighting: 'high contrast, dramatic shadows, chiaroscuro',
    palette: 'rich blacks, selective highlights, desaturated midtones',
    mood: 'tension, weight, significance',
    reference: 'Roger Deakins, Gordon Willis',
  },
  'cinematic-ethereal': {
    lighting: 'soft diffused light, golden hour, lens flares',
    palette: 'warm ambers, soft whites, pastel accents',
    mood: 'dreamlike, nostalgic, romantic',
    reference: 'Emmanuel Lubezki, Janusz Kamiński',
  },
  noir: {
    lighting: 'harsh shadows, venetian blind patterns, neon accents',
    palette: 'black and white with occasional color splash',
    mood: 'mystery, danger, moral ambiguity',
    reference: 'John Alton, Gregg Toland',
  },
  documentary: {
    lighting: 'natural, available light, unflattering',
    palette: 'muted, realistic, ungraded',
    mood: 'authentic, raw, immediate',
    reference: 'Robert Richardson, Frederick Elmes',
  },
  'fantasy-epic': {
    lighting: 'god rays, volumetric fog, magical glow',
    palette: 'rich jewel tones, gold accents, deep shadows',
    mood: 'wonder, scale, mythic',
    reference: 'Andrew Lesnie, Robert Richardson',
  },
  horror: {
    lighting: 'underlit faces, motivated darkness, green/cold tones',
    palette: 'desaturated, sickly greens, deep blacks',
    mood: 'dread, unease, wrongness',
    reference: 'Dean Cundey, Robert Richardson',
  },
  'animation-2d': {
    lighting: 'flat with cel-shading, bold shadows',
    palette: 'vibrant, limited, graphic',
    mood: 'stylized, expressive, iconic',
    reference: 'Studio Ghibli, Spider-Verse',
  },
  'graphic-novel': {
    lighting: 'stark contrast, bold ink blacks',
    palette: 'limited color palette, spot colors',
    mood: 'dramatic, stylized, punchy',
    reference: 'Sin City, 300, Watchmen',
  },
}

// Camera framing options
const FRAMING_OPTIONS = {
  'extreme-wide': 'Establishes location, character feels small/insignificant',
  wide: 'Shows environment and character relationship to space',
  'medium-wide': 'Full body, comfortable conversation distance',
  medium: 'Waist up, intimate but not invasive',
  'medium-close': 'Chest up, emotional connection',
  'close-up': 'Face fills frame, emotional intensity',
  'extreme-close-up': 'Detail shot, eyes/hands/object, maximum intensity',
  'over-shoulder': 'POV hint, connection between characters',
  'dutch-angle': 'Disorientation, psychological instability',
  'birds-eye': 'Surveillance, helplessness, fate',
  'worms-eye': 'Power, dominance, threat',
}

/**
 * Main Visual Concept Generator Tool
 */
export const createVisualConceptTool = (state: WritersRoomState) => {
  return new DynamicStructuredTool({
    name: 'generate_visual_concept',
    description: `Generate detailed visual concepts for story moments.

This tool creates comprehensive visual descriptions that can be used for:
- Storyboard panels
- AI image generation prompts
- Cinematographic planning
- Mood communication to collaborators

It considers:
- Visual style/genre conventions
- Character emotional states
- Story themes and symbolism
- Practical shot composition

Returns: Detailed visual concept with framing, lighting, composition, and symbolic elements.`,
    schema: z.object({
      moment: z.string().describe('Description of the story moment to visualize'),
      style: z
        .enum([
          'cinematic-dramatic',
          'cinematic-ethereal',
          'noir',
          'documentary',
          'fantasy-epic',
          'horror',
          'animation-2d',
          'graphic-novel',
          'auto',
        ])
        .optional()
        .default('auto')
        .describe('Visual style preset (auto selects based on series bible)'),
      emotionalTone: z
        .string()
        .optional()
        .describe('Primary emotion to convey (e.g., "desperate hope", "quiet dread")'),
      characters: z.array(z.string()).optional().describe('Characters in the shot'),
      focusElement: z.string().optional().describe('What should draw the eye first'),
      includeSymbolism: z
        .boolean()
        .optional()
        .default(true)
        .describe('Generate symbolic visual elements'),
      outputFormat: z
        .enum(['full_concept', 'image_prompt', 'storyboard_panel', 'all'])
        .optional()
        .default('all')
        .describe('Output format'),
    }),
    func: async ({
      moment,
      style = 'auto',
      emotionalTone,
      characters = [],
      focusElement,
      includeSymbolism = true,
      outputFormat = 'all',
    }) => {
      // Auto-detect style from series bible if not specified
      const detectedStyle = style === 'auto' ? detectStyleFromBible(state.seriesBible) : style

      const stylePreset =
        STYLE_PRESETS[detectedStyle as keyof typeof STYLE_PRESETS] ||
        STYLE_PRESETS['cinematic-dramatic']

      // Analyze the moment for key visual elements
      const momentAnalysis = analyzeMoment(moment, emotionalTone)

      // Determine framing based on emotional content
      const recommendedFraming = selectFraming(momentAnalysis, characters.length)

      // Find character states if available
      const characterDetails = characters.map(name => {
        const charState = state.characters.find(c => c.name.toLowerCase() === name.toLowerCase())
        return charState
          ? { name, valence: charState.metrics.valence, arousal: charState.metrics.arousal }
          : { name, valence: 0, arousal: 50 }
      })

      // Generate symbolic elements
      const symbolism = includeSymbolism
        ? generateSymbolism(moment, state.seriesBible, momentAnalysis)
        : null

      // Build the visual concept
      const concept = {
        moment,
        style: detectedStyle,
        styleDetails: stylePreset,

        composition: {
          framing: recommendedFraming.type,
          framingReason: recommendedFraming.reason,
          focusElement: focusElement || momentAnalysis.suggestedFocus,
          eyeflow: generateEyeflow(momentAnalysis, focusElement),
        },

        lighting: {
          setup: stylePreset.lighting,
          keyDirection: momentAnalysis.lightDirection,
          mood: stylePreset.mood,
          colorTemperature: momentAnalysis.temperature,
        },

        characters: characterDetails.map(c => ({
          name: c.name,
          positioning: getCharacterPositioning(c, characters.length),
          facialExpression: getExpressionFromMetrics(c.valence, c.arousal),
          bodyLanguage: getBodyLanguageFromMetrics(c.valence, c.arousal),
        })),

        ...(symbolism && { symbolism }),

        environmentDetails: extractEnvironment(moment, state.seriesBible),
      }

      // Generate outputs based on format
      const outputs: Record<string, any> = {}

      if (outputFormat === 'full_concept' || outputFormat === 'all') {
        outputs.fullConcept = concept
      }

      if (outputFormat === 'image_prompt' || outputFormat === 'all') {
        outputs.imagePrompt = generateImagePrompt(concept)
      }

      if (outputFormat === 'storyboard_panel' || outputFormat === 'all') {
        outputs.storyboardPanel = {
          panel: 1,
          action: moment,
          shot: `${recommendedFraming.type} - ${concept.composition.framingReason}`,
          audio: `${emotionalTone || momentAnalysis.emotion} atmosphere`,
          notes: symbolism?.interpretation || 'Standard shot',
        }
      }

      return JSON.stringify({
        success: true,
        ...outputs,
      })
    },
  })
}

/**
 * Detect style from series bible
 */
function detectStyleFromBible(bible: Record<string, any>): string {
  const tone = (bible.tone || []).join(' ').toLowerCase()
  const genre = (bible.genre || []).join(' ').toLowerCase()

  if (tone.includes('dark') || tone.includes('gritty') || genre.includes('noir')) {
    return 'noir'
  }
  if (genre.includes('horror') || tone.includes('unsettling')) {
    return 'horror'
  }
  if (genre.includes('fantasy') || genre.includes('epic')) {
    return 'fantasy-epic'
  }
  if (tone.includes('documentary') || tone.includes('realistic')) {
    return 'documentary'
  }
  if (tone.includes('whimsical') || genre.includes('animation')) {
    return 'animation-2d'
  }
  if (tone.includes('dramatic')) {
    return 'cinematic-dramatic'
  }

  return 'cinematic-dramatic' // default
}

/**
 * Analyze moment for visual elements
 */
function analyzeMoment(
  moment: string,
  emotionalTone?: string
): {
  emotion: string
  intensity: 'low' | 'medium' | 'high'
  suggestedFocus: string
  lightDirection: string
  temperature: string
  isInterior: boolean
  timeOfDay: string
} {
  const momentLower = moment.toLowerCase()

  // Detect emotion
  let emotion = emotionalTone || 'neutral'
  let intensity: 'low' | 'medium' | 'high' = 'medium'

  if (
    momentLower.includes('explode') ||
    momentLower.includes('scream') ||
    momentLower.includes('rage')
  ) {
    intensity = 'high'
    emotion = emotion || 'anger'
  } else if (
    momentLower.includes('whisper') ||
    momentLower.includes('quiet') ||
    momentLower.includes('pause')
  ) {
    intensity = 'low'
    emotion = emotion || 'contemplative'
  }

  // Detect location type
  const isInterior =
    momentLower.includes('room') ||
    momentLower.includes('inside') ||
    momentLower.includes('office') ||
    momentLower.includes('home')

  // Detect time
  let timeOfDay = 'day'
  if (
    momentLower.includes('night') ||
    momentLower.includes('midnight') ||
    momentLower.includes('dark')
  ) {
    timeOfDay = 'night'
  } else if (momentLower.includes('dawn') || momentLower.includes('sunrise')) {
    timeOfDay = 'dawn'
  } else if (momentLower.includes('sunset') || momentLower.includes('dusk')) {
    timeOfDay = 'dusk'
  }

  // Suggest focus element
  let suggestedFocus = 'character face'
  if (momentLower.includes('hand') || momentLower.includes('hold')) {
    suggestedFocus = 'hands/object interaction'
  } else if (
    momentLower.includes('eye') ||
    momentLower.includes('look') ||
    momentLower.includes('gaze')
  ) {
    suggestedFocus = 'eyes'
  }

  return {
    emotion,
    intensity,
    suggestedFocus,
    lightDirection: intensity === 'high' ? 'harsh side light' : 'soft front light',
    temperature:
      emotion.includes('warm') || emotion.includes('hope') ? 'warm (3200K)' : 'cool (5600K)',
    isInterior,
    timeOfDay,
  }
}

/**
 * Select appropriate framing
 */
function selectFraming(
  analysis: ReturnType<typeof analyzeMoment>,
  characterCount: number
): { type: string; reason: string } {
  if (analysis.intensity === 'high') {
    return {
      type: 'close-up',
      reason: 'High emotional intensity demands facial detail',
    }
  }

  if (characterCount >= 3) {
    return {
      type: 'medium-wide',
      reason: 'Multiple characters need spatial relationship',
    }
  }

  if (characterCount === 2) {
    return {
      type: 'over-shoulder',
      reason: 'Two-person scene benefits from POV hint',
    }
  }

  if (analysis.intensity === 'low') {
    return {
      type: 'medium',
      reason: 'Quiet moment allows comfortable distance',
    }
  }

  return {
    type: 'medium-close',
    reason: 'Standard emotional connection framing',
  }
}

/**
 * Generate eyeflow description
 */
function generateEyeflow(
  analysis: ReturnType<typeof analyzeMoment>,
  focusElement?: string
): string {
  const focus = focusElement || analysis.suggestedFocus
  return `Eye enters frame at ${focus}, follows to character reaction, exits with environmental context`
}

/**
 * Get character positioning
 */
function getCharacterPositioning(
  char: { name: string; valence: number; arousal: number },
  totalChars: number
): string {
  if (char.valence < -30) {
    return 'Isolated, pushed to frame edge'
  }
  if (char.arousal > 70) {
    return 'Centered, dominant in frame'
  }
  if (totalChars > 1) {
    return 'Rule of thirds, conversational distance'
  }
  return 'Centered with breathing room'
}

/**
 * Get expression from metrics
 */
function getExpressionFromMetrics(valence: number, arousal: number): string {
  if (valence > 50 && arousal > 50) return 'Animated joy, open expression'
  if (valence > 50 && arousal < 30) return 'Serene contentment, soft smile'
  if (valence < -50 && arousal > 50) return 'Anguished, tense features'
  if (valence < -50 && arousal < 30) return 'Hollow despair, blank stare'
  if (arousal > 70) return 'Alert, wide eyes, engaged'
  if (arousal < 30) return 'Tired, heavy lids, withdrawn'
  return 'Neutral, attentive'
}

/**
 * Get body language from metrics
 */
function getBodyLanguageFromMetrics(valence: number, arousal: number): string {
  if (valence > 50 && arousal > 50) return 'Open posture, expansive gestures'
  if (valence > 50 && arousal < 30) return 'Relaxed, comfortable, at ease'
  if (valence < -50 && arousal > 50) return 'Tense, coiled, ready to snap'
  if (valence < -50 && arousal < 30) return 'Collapsed, protective, small'
  if (arousal > 70) return 'Leaning forward, engaged'
  if (arousal < 30) return 'Slumped, low energy'
  return 'Balanced, neutral stance'
}

/**
 * Generate symbolic elements
 */
function generateSymbolism(
  moment: string,
  bible: Record<string, any>,
  analysis: ReturnType<typeof analyzeMoment>
): { elements: string[]; interpretation: string } | null {
  const themes = bible.themes || []
  const elements: string[] = []
  const momentLower = moment.toLowerCase()

  // Theme-based symbolism
  if (themes.some((t: string) => t.toLowerCase().includes('power'))) {
    if (momentLower.includes('rise') || momentLower.includes('stand')) {
      elements.push('Vertical lines in composition (power rising)')
    }
    if (momentLower.includes('fall') || momentLower.includes('defeat')) {
      elements.push('Downward angles, descending stairs')
    }
  }

  if (themes.some((t: string) => t.toLowerCase().includes('isolation'))) {
    elements.push('Negative space around character')
    elements.push('Cold colors, muted palette')
  }

  if (themes.some((t: string) => t.toLowerCase().includes('transformation'))) {
    elements.push('Mirrors/reflections showing change')
    elements.push('Doorways/thresholds (liminal spaces)')
  }

  // Universal symbolism based on emotional content
  if (analysis.emotion.includes('hope')) {
    elements.push('Light source visible in frame (window, lamp, sun)')
  }
  if (analysis.emotion.includes('trapped') || analysis.emotion.includes('despair')) {
    elements.push('Bars, grids, or geometric imprisonment motifs')
  }

  if (elements.length === 0) {
    elements.push('Character relationship to environment')
    elements.push('Color contrast reinforcing emotion')
  }

  return {
    elements,
    interpretation: `Visual elements support ${analysis.emotion} through ${elements[0]?.toLowerCase() || 'composition'}`,
  }
}

/**
 * Extract environment details
 */
function extractEnvironment(
  moment: string,
  bible: Record<string, any>
): {
  setting: string
  atmosphere: string
  details: string[]
} {
  const locations = bible.locations || []
  const momentLower = moment.toLowerCase()

  // Try to match location from bible
  const matchedLocation = locations.find((l: any) =>
    momentLower.includes(l.name?.toLowerCase() || '')
  )

  const details: string[] = []

  // Extract environmental cues from moment
  if (momentLower.includes('rain') || momentLower.includes('storm')) {
    details.push('Wet surfaces with reflections')
    details.push('Rain streaks on windows')
  }
  if (momentLower.includes('crowd') || momentLower.includes('busy')) {
    details.push('Background motion blur')
    details.push('Depth through layers of people')
  }

  return {
    setting: matchedLocation?.name || 'Unspecified location',
    atmosphere: matchedLocation?.description || 'Neutral atmosphere',
    details: details.length > 0 ? details : ['Standard environmental detail'],
  }
}

/**
 * Generate optimized image prompt
 */
function generateImagePrompt(concept: any): string {
  const parts: string[] = []

  // Shot type
  parts.push(concept.composition.framing)

  // Subject
  if (concept.characters.length > 0) {
    const charDescs = concept.characters.map(
      (c: any) =>
        `${c.name} with ${c.facialExpression.toLowerCase()}, ${c.bodyLanguage.toLowerCase()}`
    )
    parts.push(charDescs.join(', '))
  }

  // Lighting
  parts.push(concept.lighting.setup)
  parts.push(concept.lighting.colorTemperature)

  // Style
  parts.push(concept.styleDetails.palette)

  // Technical
  parts.push('cinematic composition, film grain, shallow depth of field')

  // Add reference if available
  if (concept.styleDetails.reference) {
    parts.push(`style of ${concept.styleDetails.reference}`)
  }

  return parts.join(', ')
}

/**
 * Beat to storyboard converter
 */
export const createBeatToStoryboardTool = (state: WritersRoomState) => {
  return new DynamicStructuredTool({
    name: 'beat_to_storyboard',
    description:
      'Convert a story beat into a sequence of storyboard panels with visual directions.',
    schema: z.object({
      beatId: z.string().describe('ID of the beat to convert'),
      panelCount: z
        .number()
        .optional()
        .default(3)
        .describe('Number of panels to generate (3-6 recommended)'),
    }),
    func: async ({ beatId, panelCount = 3 }) => {
      const beat = state.beatBoard.find(b => b.id === beatId)

      if (!beat) {
        return JSON.stringify({
          success: false,
          error: `Beat ${beatId} not found`,
        })
      }

      // Break beat into visual moments
      const moments = breakBeatIntoMoments(beat, panelCount)

      // Generate panel for each moment
      const panels = moments.map((moment, index) => ({
        panel: index + 1,
        action: moment.action,
        shot: moment.shot,
        dialogue: moment.dialogue,
        soundEffects: moment.sfx,
        notes: moment.notes,
        duration: moment.duration,
      }))

      return JSON.stringify({
        success: true,
        beatId,
        beatLogline: beat.logline,
        totalPanels: panels.length,
        estimatedDuration: panels.reduce((sum, p) => sum + (p.duration || 3), 0) + ' seconds',
        panels,
      })
    },
  })
}

/**
 * Break beat into visual moments
 */
function breakBeatIntoMoments(
  beat: BeatCard,
  count: number
): Array<{
  action: string
  shot: string
  dialogue?: string
  sfx?: string
  notes: string
  duration: number
}> {
  const content = beat.content || beat.logline
  const moments: ReturnType<typeof breakBeatIntoMoments> = []

  // Start with establishing shot
  moments.push({
    action: `Establish scene: ${beat.logline.split('.')[0]}`,
    shot: 'Wide establishing shot',
    notes: beat.visualHook || 'Set the scene',
    duration: 3,
  })

  // Middle panels based on character count and emotional shifts
  const charCount = beat.charactersInvolved.length
  const emotionalShifts = Object.entries(beat.emotionalShifts || {})

  if (emotionalShifts.length > 0) {
    const [charName, shift] = emotionalShifts[0]
    moments.push({
      action: `${charName} transitions from ${shift.from} to ${shift.to}`,
      shot: 'Medium close-up on reaction',
      notes: 'Key emotional beat',
      duration: 4,
    })
  } else if (charCount > 1) {
    moments.push({
      action: 'Character interaction',
      shot: 'Over-shoulder shot',
      notes: 'Show relationship dynamic',
      duration: 3,
    })
  }

  // Ending panel
  if (moments.length < count) {
    moments.push({
      action: 'Scene conclusion',
      shot: 'Match cut or symbolic exit',
      notes: beat.setupsPayoffs?.setupId ? 'Setup established' : 'Transition out',
      duration: 2,
    })
  }

  // Pad to requested count if needed
  while (moments.length < count) {
    moments.splice(moments.length - 1, 0, {
      action: 'Continuation of action',
      shot: 'Coverage shot',
      notes: 'Fill moment',
      duration: 2,
    })
  }

  return moments.slice(0, count)
}

// Export all visual tools
export const createAllVisualTools = (state: WritersRoomState) => [
  createVisualConceptTool(state),
  createBeatToStoryboardTool(state),
]
