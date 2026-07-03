'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useBibleLock } from '@/domains/storyteller/state/queries/useBibleLock'

export function useBibleState(projectId: string | undefined) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const bibleParamValue = searchParams?.get('bible') ?? null
  const [optimisticBibleOpen, setOptimisticBibleOpen] = useState<boolean | null>(null)
  const bibleLockQuery = useBibleLock(projectId)

  useEffect(() => {
    if (optimisticBibleOpen === null) return
    const urlState = bibleParamValue === 'open'
    if (optimisticBibleOpen === urlState) {
      setOptimisticBibleOpen(null)
    }
  }, [bibleParamValue, optimisticBibleOpen])

  const isWorldBibleOpen = optimisticBibleOpen ?? (bibleParamValue === 'open')

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
    if (!pathname || searchParams?.has('bible')) return
    const next = new URLSearchParams(searchParams?.toString() || '')
    next.set('bible', 'open')
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }, [pathname, router, searchParams])

  // Notify components when bible opens/closes
  useEffect(() => {
    if (bibleParamValue === 'open') {
      window.dispatchEvent(new CustomEvent('bible-opened'))
    }
  }, [bibleParamValue])

  // Listen for world bible toggle
  useEffect(() => {
    const handleToggle = () => {
      const nextState = !isWorldBibleOpen
      setOptimisticBibleOpen(nextState)
      const params = new URLSearchParams(searchParams?.toString() || '')
      if (nextState) {
        params.set('bible', 'open')
      } else {
        params.set('bible', 'off')
      }
      router.push(`?${params.toString()}`)
    }
    window.addEventListener('toggle-world-bible', handleToggle)
    return () => window.removeEventListener('toggle-world-bible', handleToggle)
  }, [isWorldBibleOpen, searchParams, router])

  const toggleBible = useCallback(() => {
    const nextState = !isWorldBibleOpen
    setOptimisticBibleOpen(nextState)
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (nextState) {
      params.set('bible', 'open')
      window.dispatchEvent(new Event('bible-opened'))
    } else {
      params.set('bible', 'off')
    }
    router.push(`?${params.toString()}`)
  }, [isWorldBibleOpen, searchParams, router])

  const closeBible = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('bible', 'off')
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
