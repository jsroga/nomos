import { NextRequest, NextResponse } from 'next/server'
import { beatCardsFromRows } from '@/domains/storyteller/core/io/resolve-manuscript-section-target'
import { compileAndHumanizeEpisodeManuscript } from '@/domains/storyteller/core/io/compile-episode-manuscript-pass'
import { ManuscriptMode, storytellerService } from '@/domains/storyteller/server'
import { requireAuth } from '@/shared/auth/auth'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { HttpStatus, QueryParam } from '@/shared/data/constants/protocol'
import { recordFromJson, readString } from '@/shared/data/json-guards'

export enum CompileManuscriptError {
  Empty = 'EMPTY_COMPILE',
}

enum CompileField {
  Mode = 'mode',
}

enum CompileLog {
  Error = 'Script compile error:',
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

    const access = await tryProjectScope(projectId, session.user.id)
    if (!access) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: HttpStatus.NOT_FOUND })
    }

    const episodeId = readString(body[QueryParam.EpisodeId])
    if (!episodeId) {
      return NextResponse.json({ error: API_ERROR.EPISODE_ID_REQUIRED }, { status: HttpStatus.BAD_REQUEST })
    }

    const ctx = { userId: session.user.id }
    const { episodes: episodeRows } = await storytellerService.listEpisodes({ projectId }, ctx)
    const episode = episodeRows.find(row => row.id === episodeId)
    if (!episode) {
      return NextResponse.json({ error: API_ERROR.EPISODE_ACCESS_DENIED }, { status: HttpStatus.NOT_FOUND })
    }

    const { beats: beatRows } = await storytellerService.listBeats({ episodeId }, ctx)
    const mode =
      parseManuscriptMode(readString(body[CompileField.Mode])) ??
      parseManuscriptMode(episode.manuscriptMode) ??
      ManuscriptMode.Script

    const result = await compileAndHumanizeEpisodeManuscript({
      projectId,
      episodeId,
      beats: beatCardsFromRows(beatRows),
      mode,
    })

    if (result.compiled.trim().length === 0) {
      return NextResponse.json({ error: CompileManuscriptError.Empty }, { status: HttpStatus.BAD_REQUEST })
    }

    if (result.persist && result.humanized) {
      await storytellerService.updateEpisodeScript(episodeId, result.humanized, ctx)
    }

    return NextResponse.json({
      persist: result.persist,
      scriptContent: result.persist ? (result.humanized ?? result.compiled) : result.compiled,
    })
  } catch (error) {
    console.error(CompileLog.Error, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : API_ERROR.INTERNAL_ERROR },
      { status: HttpStatus.INTERNAL }
    )
  }
}
