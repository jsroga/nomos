import '@/shared/data/server-guard'
import { compileEpisodeManuscript } from '@/domains/storyteller/core/manuscript/compile-episode-manuscript'
import { runCompileHumanizePass } from '@/domains/storyteller/core/manuscript/compile-humanize-pass'
import { claimCheckBeat } from '@/domains/storyteller/core/claim-check'
import { humanizeBeatDraft } from '@/domains/storyteller/ai/workflows/beat-draft-humanize'
import type { BeatCard } from '@/domains/storyteller/core/types/story-types'
import type { ManuscriptMode } from '@/domains/storyteller/core/types/enums'

export async function compileAndHumanizeEpisodeManuscript(input: {
  projectId: string
  episodeId: string
  beats: BeatCard[]
  mode: ManuscriptMode
}): Promise<{ compiled: string; humanized: string | null; persist: boolean }> {
  const compiled = compileEpisodeManuscript(input.beats, input.mode)
  const result = await runCompileHumanizePass({
    compiled,
    humanize: draft =>
      humanizeBeatDraft(
        {
          projectId: input.projectId,
          episodeId: input.episodeId,
          brief: compiled,
          characters: [],
        },
        draft
      ),
    claimCheck: claimCheckBeat,
  })
  return { compiled, ...result }
}
