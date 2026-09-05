import { persistManuscriptSectionOnVerdict, manuscriptVerdictOutputFromResume } from '@/domains/storyteller/core/manuscript/splice-manuscript-section'
import type { ManuscriptSpan } from '@/domains/storyteller/core/manuscript/manuscript-span'
import { patchStorytellerEpisode } from '@/domains/storyteller/core/io/storyteller.api'
import { EpisodePatchColumnName } from '@/domains/storyteller/core/io/episode-patch'

export async function applyManuscriptSectionVerdict(input: {
  resume: { ok: boolean; result?: unknown }
  scriptContent: string
  span: ManuscriptSpan | null
  episodeId: string
  onChange: (content: string) => void
  editor: HTMLDivElement | null
}): Promise<void> {
  if (!input.resume.ok) return
  const output = manuscriptVerdictOutputFromResume(input.resume.result)
  if (!output) return
  const next = persistManuscriptSectionOnVerdict({
    killed: output.killed,
    saved: output.saved,
    scriptContent: input.scriptContent,
    span: input.span,
    finalDraft: output.finalDraft,
  })
  if (next === null || input.episodeId.length === 0) return
  await patchStorytellerEpisode(input.episodeId, {
    [EpisodePatchColumnName.ScriptContent]: next,
  })
  input.onChange(next)
  if (input.editor) input.editor.innerText = next
}
