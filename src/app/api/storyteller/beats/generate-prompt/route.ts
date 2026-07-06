import { NextRequest, NextResponse } from 'next/server'
import { createStorytellerAgent } from '@/domains/storyteller/server'
import { withAuth, type AuthenticatedRequest } from '@/shared/data/api-utils'

const PROMPT_GENERATOR_SYSTEM = `You are a Visual Director for a film. 
Your task is to take a story beat and convert it into a vivid, specific visual image prompt for an AI image generator.

THE BEAT:
{beatContent}

CONTEXT:
Beat Type: {beatType}
Characters: {characters}
Visual Hook: {visualHook}
Setting: {setting}

INSTRUCTIONS:
- Create a SINGLE, detailed image prompt.
- Focus on lighting, composition, and atmosphere.
- If a "Visual Hook" is provided, make it the center of the image.
- Keep it under 50 words.
- Style: Rough white-and-dark storyboard sketch, high contrast, cinematic framing.
- Goal: Pick the single best frame that represents this beat's action.
- output ONLY the prompt string. No "Prompt:" prefix.`

export const POST = withAuth(async (req: NextRequest, _auth: AuthenticatedRequest) => {
  try {
    const { beat } = await req.json()

    if (!beat) {
      return NextResponse.json({ error: 'Missing beat data' }, { status: 400 })
    }

    const agent = await createStorytellerAgent()

    const promptInput = PROMPT_GENERATOR_SYSTEM.replace(
      '{beatContent}',
      beat.logline + (beat.mazurElements ? `\nDetails: ${JSON.stringify(beat.mazurElements)}` : '')
    )
      .replace('{beatType}', beat.beatType || 'scene')
      .replace('{characters}', (beat.charactersInvolved || []).join(', '))
      .replace('{visualHook}', beat.visualHook || '')
      .replace('{setting}', beat.mazurElements?.setting || 'Unknown setting')

    const imagePrompt = await agent.run(
      'Generate image prompt',
      promptInput + '\n\nInstructions: Generate the image prompt.'
    )

    return NextResponse.json({ prompt: imagePrompt })
  } catch (error) {
    console.error('Prompt generation failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate prompt' },
      { status: 500 }
    )
  }
})
