import { NextRequest, NextResponse } from 'next/server'
import { ProjectForbidden, projectScope, type ProjectScope } from '@/shared/auth/project-scope'
import { withAuth, withRateLimit, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { HttpStatus } from '@/shared/data/constants/protocol'
import {
  GenerateCharacterFieldsErrorCode,
  generateCharacterFieldsRequestSchema,
} from '@/domains/storyteller/services/constants/generate-character-fields'
import {
  GenerateCharacterFieldsError,
  generateCharacterMissingFields,
} from '@/domains/storyteller/services/generate-character-fields-service'

/**
 * This route runs inference, so it needs longer than the platform default.
 * `GATEWAY_TIMEOUT_MS` is 120s; this leaves headroom above it.
 */
export const maxDuration = 150


const RATE_LIMIT_MAX_REQUESTS = 10
const RATE_LIMIT_WINDOW_MS = 60_000

function errorResponse(error: GenerateCharacterFieldsError): NextResponse {
  if (error.code === GenerateCharacterFieldsErrorCode.InsufficientContext) {
    return NextResponse.json(
      { error: API_ERROR.CHARACTER_FIELDS_INSUFFICIENT_CONTEXT },
      { status: HttpStatus.BAD_REQUEST }
    )
  }
  if (error.code === GenerateCharacterFieldsErrorCode.OpenRouterNotConfigured) {
    return NextResponse.json(
      { error: API_ERROR.OPENROUTER_API_KEY_NOT_CONFIGURED_SERVER },
      { status: HttpStatus.INTERNAL }
    )
  }
  return NextResponse.json(
    { error: API_ERROR.FAILED_GENERATE_CHARACTER_FIELDS },
    { status: HttpStatus.INTERNAL }
  )
}

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session }: AuthenticatedRequest) => {
    try {
      const parsed = generateCharacterFieldsRequestSchema.safeParse(await request.json())
      if (!parsed.success) {
        return NextResponse.json(
          { error: API_ERROR.INVALID_REQUEST_BODY },
          { status: HttpStatus.BAD_REQUEST }
        )
      }

      const { projectId, filled } = parsed.data
      let scope: ProjectScope
      try {
        scope = await projectScope(projectId, session.user.id)
      } catch (scopeError) {
        if (!(scopeError instanceof ProjectForbidden)) throw scopeError
        return NextResponse.json(
          { error: API_ERROR.PROJECT_ACCESS_DENIED },
          { status: HttpStatus.NOT_FOUND }
        )
      }

      const fields = await generateCharacterMissingFields({ scope, filled })
      return NextResponse.json({ fields })
    } catch (error) {
      if (error instanceof GenerateCharacterFieldsError) return errorResponse(error)
      console.error(API_LOG_PREFIX.CHARACTER_FIELDS_GENERATION_ERROR, error)
      return NextResponse.json(
        { error: API_ERROR.FAILED_GENERATE_CHARACTER_FIELDS },
        { status: HttpStatus.INTERNAL }
      )
    }
  }),
  { maxRequests: RATE_LIMIT_MAX_REQUESTS, windowMs: RATE_LIMIT_WINDOW_MS }
)
