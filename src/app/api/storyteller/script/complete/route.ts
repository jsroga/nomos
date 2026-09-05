import { NextRequest, NextResponse } from 'next/server'
import { ManuscriptMode } from '@/domains/storyteller/server'
import { TEXT_GEN_FAST_MODEL } from '@/shared/agent-kernel/models'
import { complete } from '@/shared/ai/gateway'
import { withGatewayContext } from '@/shared/ai/gateway/call-context'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import { requireAuth } from '@/shared/auth/auth'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { HttpStatus, QueryParam } from '@/shared/data/constants/protocol'
import { recordFromJson, readString } from '@/shared/data/json-guards'

enum ScriptGhostCopy {
  System =
    'Continue the manuscript with one sentence or a short paragraph. Do not rewrite the prefix. Match the requested format. Do not run critiques.',
}

enum ScriptGhostLog {
  Error = 'Script ghost complete error:',
}

enum ScriptGhostField {
  Prefix = 'prefix',
  Mode = 'mode',
}

function parseManuscriptMode(value: string | undefined): ManuscriptMode | undefined {
  if (value === ManuscriptMode.Novel) return ManuscriptMode.Novel
  if (value === ManuscriptMode.Script) return ManuscriptMode.Script
  return undefined
}

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })
    }

    const body = recordFromJson(await req.json())
    const projectId = readString(body[QueryParam.ProjectId])
    if (!projectId) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ID_REQUIRED }, { status: HttpStatus.BAD_REQUEST })
    }

    const scope = await tryProjectScope(projectId, session.user.id)
    if (!scope) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: HttpStatus.NOT_FOUND })
    }

    const prefix = readString(body[ScriptGhostField.Prefix])
    const episodeId = readString(body[QueryParam.EpisodeId])
    const mode = parseManuscriptMode(readString(body[ScriptGhostField.Mode]))
    if (!prefix || !episodeId || !mode) {
      return NextResponse.json({ error: API_ERROR.INVALID_REQUEST_BODY }, { status: HttpStatus.BAD_REQUEST })
    }

    const result = await withGatewayContext({ scope }, () =>
      complete({
        scope,
        feature: LlmFeature.StorytellerScriptGhost,
        model: TEXT_GEN_FAST_MODEL,
        system: `${ScriptGhostCopy.System}\nFormat: ${mode}`,
        prompt: prefix,
      })
    )

    return NextResponse.json({ result: result.text.trim() })
  } catch (error) {
    console.error(ScriptGhostLog.Error, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : API_ERROR.INTERNAL_ERROR },
      { status: HttpStatus.INTERNAL }
    )
  }
}
