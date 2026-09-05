import { NextRequest, NextResponse } from 'next/server'
import {
  ManuscriptSectionScope,
  beatCardsFromRows,
  resolveManuscriptSectionTarget,
} from '@/domains/storyteller/core/io/resolve-manuscript-section-target'
import { startManuscriptSectionDraft } from '@/domains/storyteller/core/io/start-manuscript-section-draft'
import { ManuscriptMode, storytellerService } from '@/domains/storyteller/server'
import { requireAuth } from '@/shared/auth/auth'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { HttpStatus, QueryParam } from '@/shared/data/constants/protocol'
import { recordFromJson, readNumber, readString } from '@/shared/data/json-guards'

export enum GenerateSectionError {
  ZeroBeats = 'ZERO_BEATS',
}

enum GenerateSectionField {
  Mode = 'mode',
  Scope = 'scope',
  ScriptContent = 'scriptContent',
  Caret = 'caret',
  BeatId = 'beatId',
}

enum GenerateSectionLog {
  Error = 'Script generate-section error:',
}

function parseManuscriptMode(value: string | undefined): ManuscriptMode | undefined {
  if (value === ManuscriptMode.Novel) return ManuscriptMode.Novel
  if (value === ManuscriptMode.Script) return ManuscriptMode.Script
  return undefined
}

function parseScope(value: string | undefined): ManuscriptSectionScope {
  if (value === ManuscriptSectionScope.Regenerate) return ManuscriptSectionScope.Regenerate
  return ManuscriptSectionScope.GenerateNext
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
    if (beatRows.length === 0) {
      return NextResponse.json(
        { error: GenerateSectionError.ZeroBeats },
        { status: HttpStatus.BAD_REQUEST }
      )
    }

    const cards = beatCardsFromRows(beatRows)
    const scriptContent = readString(body[GenerateSectionField.ScriptContent]) ?? episode.scriptContent ?? ''
    const mode =
      parseManuscriptMode(readString(body[GenerateSectionField.Mode])) ??
      parseManuscriptMode(episode.manuscriptMode) ??
      ManuscriptMode.Script
    const sectionScope = parseScope(readString(body[GenerateSectionField.Scope]))
    const caret = readNumber(body[GenerateSectionField.Caret]) ?? scriptContent.length
    const target = resolveManuscriptSectionTarget({
      beats: cards,
      scriptContent,
      caret,
      mode,
      scope: sectionScope,
    })
    if (!target) {
      return NextResponse.json(
        { error: GenerateSectionError.ZeroBeats },
        { status: HttpStatus.BAD_REQUEST }
      )
    }

    const requestedBeatId = readString(body[GenerateSectionField.BeatId])
    const beatId = requestedBeatId ?? target.beat.id
    const { characters } = await storytellerService.listCharacters({ projectId }, ctx)
    const result = await startManuscriptSectionDraft({
      projectId,
      episodeId,
      beatId,
      span: target.span,
      mode,
      scope: sectionScope,
      spanText: target.spanText,
      episodePremise: episode.premise ?? '',
      characterVoices: characters.map(row => ({ name: row.name, voice: row.voice })),
    })

    return NextResponse.json({
      runId: result.runId,
      status: result.status,
      message: result.message,
      draft: result.draft,
      critiques: result.critiques,
    })
  } catch (error) {
    console.error(GenerateSectionLog.Error, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : API_ERROR.INTERNAL_ERROR },
      { status: HttpStatus.INTERNAL }
    )
  }
}
