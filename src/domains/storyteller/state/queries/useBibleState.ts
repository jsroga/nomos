'use client'

import { useCallback, useLayoutEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { StorytellerQueryParam } from '@/domains/storyteller/core/storyteller-page-wire'
import {
  seedWorldBibleOpen,
  useStorytellerUiStore,
} from '@/domains/storyteller/state/useStorytellerUiStore'
import { storytellerSearchParams } from '@/domains/storyteller/state/utils/strip-bible-search-params'

export function useBibleState() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isWorldBibleOpen = useStorytellerUiStore(state => state.isWorldBibleOpen)
  const setWorldBibleOpen = useStorytellerUiStore(state => state.setWorldBibleOpen)
  const toggleWorldBible = useStorytellerUiStore(state => state.toggleWorldBible)

  useLayoutEffect(() => {
    seedWorldBibleOpen(Boolean(searchParams?.get(StorytellerQueryParam.EpisodeId)))
    if (!pathname || !searchParams) return
    const next = storytellerSearchParams(searchParams)
    if (next.toString() === searchParams.toString()) return
    const query = next.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  const closeBible = useCallback(() => {
    setWorldBibleOpen(false)
  }, [setWorldBibleOpen])

  return {
    isWorldBibleOpen,
    setWorldBibleOpen,
    toggleBible: toggleWorldBible,
    closeBible,
  }
}
