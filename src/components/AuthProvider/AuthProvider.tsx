'use client'

import { useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuthStore } from '@/shared/auth/useAuthStore'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore(state => state.setUser)

  useEffect(() => {
    const supabase = createClientComponentClient()

    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
      } catch {
        setUser(null)
      }
    })()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [setUser])

  return <>{children}</>
}
