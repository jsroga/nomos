import type { QueryClient } from '@tanstack/react-query'
import { patchStorytellerEpisode } from '@/domains/storyteller/core/io/storyteller.api'
import { EpisodePatchColumnName } from '@/domains/storyteller/core/io/episode-patch'
import { storytellerKeys } from '@/domains/storyteller/core/io/storyteller.keys'
import type { ManuscriptMode } from '@/domains/storyteller/core/types/enums'

export async function persistEpisodeManuscriptMode(
  queryClient: QueryClient,
  episodeId: string,
  mode: ManuscriptMode,
): Promise<void> {
  try {
    await patchStorytellerEpisode(episodeId, {
      [EpisodePatchColumnName.ManuscriptMode]: mode,
    })
    await queryClient.invalidateQueries({
      queryKey: storytellerKeys.episode(episodeId),
    })
  } catch {
    // Episode mode patch is best-effort; the editor stays on the prior mode.
  }
}
