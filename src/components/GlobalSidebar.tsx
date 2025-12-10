'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { Map, Box, Settings, LogOut, User, BookOpen, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

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
    <div className="w-16 h-screen bg-card border-r border-border flex flex-col items-center py-4 gap-4 z-50">
      <div className="mb-4">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
          T
        </div>
      </div>

      <Link href={`/${projectId}/storyteller`}>
        <Button
          variant={isActive(`/${projectId}/storyteller`) ? 'default' : 'ghost'}
          size="icon"
          title="Storyteller"
          className="w-10 h-10"
        >
          <BookOpen size={20} />
        </Button>
      </Link>

      <Link href={`/${projectId}/world-gen`}>
        <Button
          variant={isActive(`/${projectId}/world-gen`) ? 'default' : 'ghost'}
          size="icon"
          title="World Building"
          className="w-10 h-10"
        >
          <Map size={20} />
        </Button>
      </Link>

      <Link href={`/${projectId}/asset-exporter`}>
        <Button
          variant={isActive(`/${projectId}/asset-exporter`) ? 'default' : 'ghost'}
          size="icon"
          title="3D Asset Exporter"
          className="w-10 h-10"
        >
          <Box size={20} />
        </Button>
      </Link>

      <Link href={`/${projectId}/interior-design`}>
        <Button
          variant={isActive(`/${projectId}/interior-design`) ? 'default' : 'ghost'}
          size="icon"
          title="Interior Designer"
          className="w-10 h-10"
        >
          <Home size={20} />
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
