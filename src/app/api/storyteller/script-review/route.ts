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
} from '@/domains/storyteller/server'
import { withAuth, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import {
  HttpMethod,
  ScriptReviewApiDoc,
  ScriptReviewMode,
  StringSeparator,
} from '@/shared/data/constants/protocol'
import { ReviewPersonaKey } from '@/domains/storyteller/services/constants/script-review'

const VALID_SCRIPT_REVIEW_PERSONAS = [
  ReviewPersonaKey.GeorgeRrMartin,
  ReviewPersonaKey.VinceGilligan,
  ReviewPersonaKey.DavidLynch,
] as const

export const POST = withAuth(async (request: NextRequest, _auth: AuthenticatedRequest) => {
  try {
    const body = await request.json()
    const { script, episodePremise, characters, focusAreas, quickMode, persona } = body

    if (!script || typeof script !== 'string') {
      return NextResponse.json({ error: API_ERROR.SCRIPT_CONTENT_REQUIRED }, { status: 400 })
    }

    if (script.length < 50) {
      return NextResponse.json({ error: API_ERROR.SCRIPT_TOO_SHORT }, { status: 400 })
    }

    if (quickMode && persona) {
      if (!VALID_SCRIPT_REVIEW_PERSONAS.includes(persona)) {
        return NextResponse.json(
          {
            error: `Invalid persona. Choose from: ${VALID_SCRIPT_REVIEW_PERSONAS.join(StringSeparator.CommaSpace)}`,
          },
          { status: 400 }
        )
      }

      const review = await quickReview(script, persona)
      return NextResponse.json({
        success: true,
        mode: ScriptReviewMode.Quick,
        persona,
        review,
      })
    }

    const reviewRequest: ScriptReviewRequest = {
      script,
      episodePremise,
      characters,
      focusAreas,
    }

    const result = await reviewScript(reviewRequest)

    return NextResponse.json({
      success: true,
      mode: ScriptReviewMode.Full,
      ...result,
    })
  } catch (error: unknown) {
    console.error(API_LOG_PREFIX.SCRIPT_REVIEW_ERROR, error)
    return NextResponse.json(
      { error: getErrorMessage(error) || API_ERROR.SCRIPT_REVIEW_FAILED },
      { status: 500 }
    )
  }
})

export async function GET() {
  return NextResponse.json({
    endpoint: ScriptReviewApiDoc.Endpoint,
    method: HttpMethod.Post,
    description: ScriptReviewApiDoc.Description,
    personas: [
      {
        id: ReviewPersonaKey.GeorgeRrMartin,
        focus: ScriptReviewApiDoc.GeorgeFocus,
      },
      {
        id: ReviewPersonaKey.VinceGilligan,
        focus: ScriptReviewApiDoc.VinceFocus,
      },
      {
        id: ReviewPersonaKey.DavidLynch,
        focus: ScriptReviewApiDoc.LynchFocus,
      },
    ],
    usage: {
      full: {
        body: {
          script: ScriptReviewApiDoc.SampleScript,
          episodePremise: {
            title: ScriptReviewApiDoc.SampleEpisodeTitle,
            logline: ScriptReviewApiDoc.SampleEllipsis,
          },
          characters: [
            { name: ScriptReviewApiDoc.SampleCharacter, role: ScriptReviewApiDoc.SampleProtagonist },
          ],
        },
      },
      quick: {
        body: {
          script: ScriptReviewApiDoc.SampleScript,
          quickMode: true,
          persona: ScriptReviewApiDoc.PersonaChoices,
        },
      },
    },
  })
}
