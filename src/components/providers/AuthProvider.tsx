'use client'

import { useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useWorldStore(state => state.setUser)

  useEffect(() => {
    const supabase = createClientComponentClient()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [setUser])

  return <>{children}</>
}
