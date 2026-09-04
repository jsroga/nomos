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
  type ScriptReviewRequest,
} from '@/domains/storyteller/server'
import { withGatewayContext } from '@/shared/ai/gateway/call-context'
import { requireAuth } from '@/shared/auth/auth'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import {
  HttpMethod,
  HttpStatus,
  QueryParam,
  ScriptReviewApiDoc,
  ScriptReviewMode,
  StringSeparator,
} from '@/shared/data/constants/protocol'
import {
  namedRecordsFromJson,
  recordFromJson,
  readString,
  stringArrayFromJson,
} from '@/shared/data/json-guards'

enum ScriptReviewPersonaId {
  GeorgeRrMartin = 'george-rr-martin',
  VinceGilligan = 'vince-gilligan',
  DavidLynch = 'david-lynch',
}

const VALID_SCRIPT_REVIEW_PERSONAS = [
  ScriptReviewPersonaId.GeorgeRrMartin,
  ScriptReviewPersonaId.VinceGilligan,
  ScriptReviewPersonaId.DavidLynch,
] as const

type QuickReviewPersona = Parameters<typeof quickReview>[1]

function isQuickReviewPersona(value: string): value is QuickReviewPersona {
  return VALID_SCRIPT_REVIEW_PERSONAS.some((key) => key === value)
}

function scriptReviewRequestFromBody(
  script: string,
  body: Record<string, unknown>
): ScriptReviewRequest {
  const premise = recordFromJson(body.episodePremise)
  const characters = namedRecordsFromJson(body.characters).map((row) => {
    const role = readString(row.role)
    const traits = stringArrayFromJson(row.traits)
    const character: { name: string; role?: string; traits?: string[] } = { name: row.name }
    if (role) character.role = role
    if (traits.length > 0) character.traits = traits
    return character
  })

  const request: ScriptReviewRequest = { script }
  if (Object.keys(premise).length > 0) {
    request.episodePremise = {
      title: readString(premise.title),
      logline: readString(premise.logline),
      protagonistHook: readString(premise.protagonistHook),
      fatalFlaw: readString(premise.fatalFlaw),
      stakes: readString(premise.stakes),
    }
  }
  if (characters.length > 0) request.characters = characters
  return request
}

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })
    }

    const body = recordFromJson(await request.json())
    const projectId = readString(body[QueryParam.ProjectId])
    if (!projectId) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ID_REQUIRED }, { status: HttpStatus.BAD_REQUEST })
    }

    const scope = await tryProjectScope(projectId, session.user.id)
    if (!scope) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: HttpStatus.NOT_FOUND })
    }

    const script = readString(body.script)
    if (!script) {
      return NextResponse.json({ error: API_ERROR.SCRIPT_CONTENT_REQUIRED }, { status: HttpStatus.BAD_REQUEST })
    }

    if (script.length < 50) {
      return NextResponse.json({ error: API_ERROR.SCRIPT_TOO_SHORT }, { status: HttpStatus.BAD_REQUEST })
    }

    const personaRaw = readString(body.persona)
    if (body.quickMode === true && personaRaw) {
      if (!isQuickReviewPersona(personaRaw)) {
        return NextResponse.json(
          {
            error: `Invalid persona. Choose from: ${VALID_SCRIPT_REVIEW_PERSONAS.join(StringSeparator.CommaSpace)}`,
          },
          { status: HttpStatus.BAD_REQUEST }
        )
      }

      const review = await withGatewayContext({ scope }, () => quickReview(script, personaRaw))
      return NextResponse.json({
        success: true,
        mode: ScriptReviewMode.Quick,
        persona: personaRaw,
        review,
      })
    }

    const result = await withGatewayContext({ scope }, () =>
      reviewScript(scriptReviewRequestFromBody(script, body))
    )

    return NextResponse.json({
      success: true,
      mode: ScriptReviewMode.Full,
      ...result,
    })
  } catch (error: unknown) {
    console.error(API_LOG_PREFIX.SCRIPT_REVIEW_ERROR, error)
    return NextResponse.json(
      { error: getErrorMessage(error) || API_ERROR.SCRIPT_REVIEW_FAILED },
      { status: HttpStatus.INTERNAL }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: ScriptReviewApiDoc.Endpoint,
    method: HttpMethod.Post,
    description: ScriptReviewApiDoc.Description,
    personas: [
      {
        id: ScriptReviewPersonaId.GeorgeRrMartin,
        focus: ScriptReviewApiDoc.GeorgeFocus,
      },
      {
        id: ScriptReviewPersonaId.VinceGilligan,
        focus: ScriptReviewApiDoc.VinceFocus,
      },
      {
        id: ScriptReviewPersonaId.DavidLynch,
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
