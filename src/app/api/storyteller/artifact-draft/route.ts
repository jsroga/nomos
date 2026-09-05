import { NextRequest, NextResponse } from 'next/server'
import '@/domains/storyteller/core/io/mastra-runtime'
import { generateAndStartArtifactDraft, parseArtifactKind, parseBibleSection, parsePromptRegistryId } from '@/domains/storyteller/core/io/generate-artifact-draft'
import { requireAuth } from '@/shared/auth/auth'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { withGatewayContext } from '@/shared/ai/gateway/call-context'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { HttpStatus, QueryParam } from '@/shared/data/constants/protocol'
import { recordFromJson, readString } from '@/shared/data/json-guards'

enum ArtifactDraftBodyField {
  Kind = 'kind',
  Section = 'section',
  PromptId = 'promptId',
  CharacterId = 'characterId',
}

enum ArtifactDraftLog {
  Error = 'Artifact-draft start error:',
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

    const kind = parseArtifactKind(readString(body[ArtifactDraftBodyField.Kind]))
    const promptId = parsePromptRegistryId(readString(body[ArtifactDraftBodyField.PromptId]))
    if (!kind || !promptId) {
      return NextResponse.json({ error: API_ERROR.INVALID_REQUEST_BODY }, { status: HttpStatus.BAD_REQUEST })
    }

    const started = await withGatewayContext({ scope }, () =>
      generateAndStartArtifactDraft({
        scope,
        kind,
        promptId,
        section: parseBibleSection(readString(body[ArtifactDraftBodyField.Section])),
        characterId: readString(body[ArtifactDraftBodyField.CharacterId]),
        episodeId: readString(body[QueryParam.EpisodeId]),
      })
    )

    return NextResponse.json(started)
  } catch (error) {
    console.error(ArtifactDraftLog.Error, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : API_ERROR.INTERNAL_ERROR },
      { status: HttpStatus.INTERNAL }
    )
  }
}
