'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { Map, Box, LogOut, BookOpen, Home, Repeat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { GlowEffect } from '@/components/ui/glow-effect'
import { TOUR_STEP_IDS } from '@/lib/tour-constants'

export const GlobalSidebar = () => {
  const pathname = usePathname()
  const params = useParams()
  const projectId = params?.projectId as string
  const supabase = createClientComponentClient()
  const user = useWorldStore(state => state.user)
  const setUser = useWorldStore(state => state.setUser)

  const isActive = (path: string) => pathname?.startsWith(path)

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
      }
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="w-16 h-screen bg-card border-r border-border flex flex-col items-center pt-2 pb-4 gap-4 z-50">
      <div className="mb-4">
        <Link href="/" className="w-10 h-10 flex items-center justify-center relative group z-50">
          <GlowEffect
            colors={['#4f46e5', '#3b82f6', '#8b5cf6', '#6366f1']}
            mode="static"
            blur="medium"
            scale={0.8}
            className="opacity-0 group-hover:opacity-50 transition-opacity duration-500"
          />
          <img
            src="/favicon.svg"
            alt="Logo"
            className="w-full h-full object-contain relative z-10 transition-transform duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]"
          />
        </Link>
      </div>

      <Link href={`/app/${projectId}/storyteller`}>
        <Button
          variant={isActive(`/app/${projectId}/storyteller`) ? 'default' : 'ghost'}
          size="icon"
          title="Storyteller"
          className="w-10 h-10"
        >
          <BookOpen size={20} />
        </Button>
      </Link>

      <Link href={`/app/${projectId}/world-gen`} id={TOUR_STEP_IDS.WORLD_GEN_NAV}>
        <Button
          variant={isActive(`/app/${projectId}/world-gen`) ? 'default' : 'ghost'}
          size="icon"
          title="World Building"
          className="w-10 h-10"
        >
          <Map size={20} />
        </Button>
      </Link>

      <Link href={`/app/${projectId}/asset-exporter`}>
        <Button
          variant={isActive(`/app/${projectId}/asset-exporter`) ? 'default' : 'ghost'}
          size="icon"
          title="3D Asset Exporter"
          className="w-10 h-10"
        >
          <Box size={20} />
        </Button>
      </Link>

      <Link href={`/app/${projectId}/interior-design`}>
        <Button
          variant={isActive(`/app/${projectId}/interior-design`) ? 'default' : 'ghost'}
          size="icon"
          title="Interior Designer"
          className="w-10 h-10"
        >
          <Home size={20} />
        </Button>
      </Link>

      <Link href={`/app/${projectId}/loop-creator`}>
        <Button
          variant={isActive(`/app/${projectId}/loop-creator`) ? 'default' : 'ghost'}
          size="icon"
          title="Loop Creator"
          className="w-10 h-10"
        >
          <Repeat size={20} />
        </Button>
      </Link>

      <div className="mt-auto flex flex-col items-center gap-4">
        {user && (
          <div className="group relative">
            <Avatar className="w-8 h-8 cursor-pointer border border-border hover:border-primary">
              <AvatarImage src={user.user_metadata.avatar_url} />
              <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
            </Avatar>

            <div className="absolute left-full bottom-0 ml-2 bg-popover border border-border p-2 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[80] pointer-events-none group-hover:pointer-events-auto">
              <p className="text-xs font-medium mb-1">{user.email}</p>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          title="Logout"
          className="w-8 h-8 text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut size={16} />
        </Button>
      </div>
    </div>
  )
}
