'use client'

import { useState, useEffect, useCallback, useLayoutEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useBibleLock } from '@/domains/storyteller/state/queries/useBibleLock'
import { StorytellerQueryParam } from '@/domains/storyteller/core/storyteller-page-wire'
import {
  seedWorldBibleOpen,
  useStorytellerUiStore,
} from '@/domains/storyteller/state/useStorytellerUiStore'
import { storytellerSearchParams } from '@/domains/storyteller/state/utils/strip-bible-search-params'

export function useBibleState(projectId: string | undefined) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isWorldBibleOpen = useStorytellerUiStore(state => state.isWorldBibleOpen)
  const setWorldBibleOpen = useStorytellerUiStore(state => state.setWorldBibleOpen)
  const toggleWorldBible = useStorytellerUiStore(state => state.toggleWorldBible)
  const bibleLockQuery = useBibleLock(projectId)

  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = (await import('@supabase/auth-helpers-nextjs')).createClientComponentClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUserEmail(user?.email || null)
    }
    fetchUser()
  }, [])

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
    isBibleLocked: bibleLockQuery.data?.isLocked ?? false,
    bibleLockedBy: bibleLockQuery.data?.lockedBy ?? null,
    userEmail,
    setWorldBibleOpen,
    toggleBible: toggleWorldBible,
    closeBible,
    bibleLockQuery,
  }
}
