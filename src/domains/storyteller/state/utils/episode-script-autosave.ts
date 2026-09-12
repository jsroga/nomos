import { EpisodePatchColumnName } from '@/domains/storyteller/core/io/episode-patch'
import { patchStorytellerEpisode } from '@/domains/storyteller/core/io/storyteller.api'
import { AutosaveScope } from '@/shared/workspace/constants/autosave'
import { autosaveKey, withAutosave } from '@/shared/workspace/utils/autosave'

export enum EpisodeScriptAutosaveAction {
  Skip = 'skip',
  Hydrate = 'hydrate',
  Persist = 'persist',
}

export function decideEpisodeScriptAutosave(input: {
  episodeId: string | null
  hydratedEpisodeId: string | null
  script: string
  lastPersisted: string | null
}): EpisodeScriptAutosaveAction {
  if (!input.episodeId || input.hydratedEpisodeId !== input.episodeId) {
    return EpisodeScriptAutosaveAction.Skip
  }
  if (input.lastPersisted === null) return EpisodeScriptAutosaveAction.Hydrate
  if (input.script === input.lastPersisted) return EpisodeScriptAutosaveAction.Skip
  return EpisodeScriptAutosaveAction.Persist
}

export async function persistEpisodeScript(episodeId: string, script: string): Promise<void> {
  await withAutosave(autosaveKey(AutosaveScope.EpisodeScript, episodeId), async () => {
    await patchStorytellerEpisode(episodeId, {
      [EpisodePatchColumnName.ScriptContent]: script,
    })
  })
}
