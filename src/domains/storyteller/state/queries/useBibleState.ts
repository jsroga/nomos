'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useBibleLock } from '@/domains/storyteller/state/queries/useBibleLock'
import {
  StorytellerBibleQuery,
  StorytellerQueryParam,
} from '@/domains/storyteller/state/constants/bible-state'

export function useBibleState(projectId: string | undefined) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const bibleParamValue = searchParams?.get(StorytellerQueryParam.Bible) ?? null
  const [optimisticBibleOpen, setOptimisticBibleOpen] = useState<boolean | null>(null)
  const bibleLockQuery = useBibleLock(projectId)

  useEffect(() => {
    if (optimisticBibleOpen === null) return
    const urlState = bibleParamValue === StorytellerBibleQuery.Open
    if (optimisticBibleOpen === urlState) {
      setOptimisticBibleOpen(null)
    }
  }, [bibleParamValue, optimisticBibleOpen])

  const isWorldBibleOpen = optimisticBibleOpen ?? (bibleParamValue === StorytellerBibleQuery.Open)

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

  // Default to bible=open on first visit
  useEffect(() => {
    if (!pathname || searchParams?.has(StorytellerQueryParam.Bible)) return
    const next = new URLSearchParams(searchParams?.toString() || '')
    next.set(StorytellerQueryParam.Bible, StorytellerBibleQuery.Open)
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }, [pathname, router, searchParams])

  const toggleBible = useCallback(() => {
    const nextState = !isWorldBibleOpen
    setOptimisticBibleOpen(nextState)
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (nextState) {
      params.set(StorytellerQueryParam.Bible, StorytellerBibleQuery.Open)
    } else {
      params.set(StorytellerQueryParam.Bible, StorytellerBibleQuery.Off)
    }
    router.push(`?${params.toString()}`)
  }, [isWorldBibleOpen, searchParams, router])

  const closeBible = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set(StorytellerQueryParam.Bible, StorytellerBibleQuery.Off)
    router.push(`?${params.toString()}`)
  }, [searchParams, router])

  return {
    isWorldBibleOpen,
    isBibleLocked: bibleLockQuery.data?.isLocked ?? false,
    bibleLockedBy: bibleLockQuery.data?.lockedBy ?? null,
    userEmail,
    setOptimisticBibleOpen,
    toggleBible,
    closeBible,
    bibleLockQuery,
  }
}
