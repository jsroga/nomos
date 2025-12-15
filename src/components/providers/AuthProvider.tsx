'use client'

import { useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useWorldStore(state => state.setUser)

  useEffect(() => {
    // Development Mock User
    if (process.env.NODE_ENV === 'development') {
        console.log("AuthProvider: Dev mode detected, mocking user 'jsroga'")
        setUser({
            id: 'dev-mock-user-id',
            email: 'jsroga@example.com',
            user_metadata: {
                user_name: 'jsroga',
                full_name: 'Jacek Sroga (Dev)'
            },
            aud: 'authenticated',
            role: 'authenticated'
        })
        return
    }

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
