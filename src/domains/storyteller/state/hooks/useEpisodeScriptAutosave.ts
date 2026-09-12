'use client'

import { useEffect, useRef } from 'react'
import { StorytellerLogMessage } from '@/domains/storyteller/core/storyteller-page-wire'
import {
  decideEpisodeScriptAutosave,
  EpisodeScriptAutosaveAction,
  persistEpisodeScript,
} from '@/domains/storyteller/state/utils/episode-script-autosave'
import { AUTOSAVE_DEBOUNCE_MS } from '@/shared/workspace/constants/autosave'

export function useEpisodeScriptAutosave(input: {
  episodeId: string | null
  script: string
  hydratedEpisodeId: string | null
}): void {
  const lastPersistedRef = useRef<string | null>(null)
  const lastEpisodeRef = useRef<string | null>(null)

  useEffect(() => {
    if (lastEpisodeRef.current === input.episodeId) return
    lastEpisodeRef.current = input.episodeId
    lastPersistedRef.current = null
  }, [input.episodeId])

  useEffect(() => {
    const episodeId = input.episodeId
    const action = decideEpisodeScriptAutosave({
      episodeId,
      hydratedEpisodeId: input.hydratedEpisodeId,
      script: input.script,
      lastPersisted: lastPersistedRef.current,
    })

    if (action === EpisodeScriptAutosaveAction.Hydrate) {
      lastPersistedRef.current = input.script
      return
    }
    if (action !== EpisodeScriptAutosaveAction.Persist || !episodeId) return

    const snapshot = input.script
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          await persistEpisodeScript(episodeId, snapshot)
          if (lastEpisodeRef.current === episodeId) {
            lastPersistedRef.current = snapshot
          }
        } catch (error) {
          console.error(StorytellerLogMessage.FailedPersistScript, error)
        }
      })()
    }, AUTOSAVE_DEBOUNCE_MS)

    return () => window.clearTimeout(handle)
  }, [input.episodeId, input.hydratedEpisodeId, input.script])
}
