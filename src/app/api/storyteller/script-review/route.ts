/**
 * Script Review API
 *
 * POST /api/storyteller/script-review
 *
 * Reviews script content using three legendary storyteller personas:
 * - George R.R. Martin: Character depth, consequences, moral complexity
 * - Vince Gilligan: Visual storytelling, transformation, rigorous logic
 * - David Lynch: Atmosphere, dream logic, the uncanny
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  reviewScript,
  quickReview,
  ScriptReviewRequest,
} from '@/domains/storyteller'
import { withAuth, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { getErrorMessage } from '@/shared/errors/error-utils'

export const POST = withAuth(async (request: NextRequest, _auth: AuthenticatedRequest) => {
  try {
    const body = await request.json()
    const { script, episodePremise, characters, focusAreas, quickMode, persona } = body

    if (!script || typeof script !== 'string') {
      return NextResponse.json({ error: 'Script content is required' }, { status: 400 })
    }

    if (script.length < 50) {
      return NextResponse.json(
        { error: 'Script too short for meaningful review (min 50 characters)' },
        { status: 400 }
      )
    }

    // Quick mode: single persona review
    if (quickMode && persona) {
      const validPersonas = ['george-rr-martin', 'vince-gilligan', 'david-lynch']
      if (!validPersonas.includes(persona)) {
        return NextResponse.json(
          { error: `Invalid persona. Choose from: ${validPersonas.join(', ')}` },
          { status: 400 }
        )
      }

      const review = await quickReview(script, persona)
      return NextResponse.json({
        success: true,
        mode: 'quick',
        persona,
        review,
      })
    }

    // Full review: all three personas + synthesis
    const reviewRequest: ScriptReviewRequest = {
      script,
      episodePremise,
      characters,
      focusAreas,
    }

    const result = await reviewScript(reviewRequest)

    return NextResponse.json({
      success: true,
      mode: 'full',
      ...result,
    })
  } catch (error: unknown) {
    console.error('[ScriptReview] Error:', error)
    return NextResponse.json({ error: getErrorMessage(error) || 'Script review failed' }, { status: 500 })
  }
})

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/storyteller/script-review',
    method: 'POST',
    description: 'Review scripts using three legendary storyteller personas',
    personas: [
      {
        id: 'george-rr-martin',
        focus: 'Character depth, consequences, moral complexity, world texture',
      },
      {
        id: 'vince-gilligan',
        focus: 'Visual storytelling, transformation arcs, rigorous logic, blocking',
      },
      {
        id: 'david-lynch',
        focus: 'Atmosphere, dream logic, the uncanny, soundscapes',
      },
    ],
    usage: {
      full: {
        body: {
          script: 'Your script content here...',
          episodePremise: { title: 'Episode Title', logline: '...' },
          characters: [{ name: 'Character', role: 'Protagonist' }],
        },
      },
      quick: {
        body: {
          script: 'Your script content here...',
          quickMode: true,
          persona: 'george-rr-martin | vince-gilligan | david-lynch',
        },
      },
    },
  })
}
