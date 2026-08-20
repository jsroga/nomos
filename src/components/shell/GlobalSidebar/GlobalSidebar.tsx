'use client'

import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { Map, Box, BookOpen, Home, Repeat } from 'lucide-react'
import { Button } from '@/components/Button'
import { GlowEffect } from '@/components/GlowEffect'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { readString } from '@/shared/data/json-guards'
import { isValidProjectId } from '@/shared/auth/security'
import { AUTH_ROUTE } from '@/shared/auth/constants/auth-messages'
import { is3dCanvasEnabled, isLoopCreatorEnabled } from '@/shared/data/constants/feature-flags'
import { AccountMenu } from './AccountMenu'

export const GlobalSidebar = () => {
  const pathname = usePathname()
  const params = useParams()
  const rawProjectId = readString(params?.projectId)
  const projectId = rawProjectId && isValidProjectId(rawProjectId) ? rawProjectId : ''

  const isActive = (path: string) => pathname?.startsWith(path)

  const storytellerHref = projectId ? `/${projectId}/storyteller` : AUTH_ROUTE.PROJECTS
  const worldGenHref = projectId ? `/${projectId}/2d-canvas` : AUTH_ROUTE.PROJECTS
  const loopCreatorHref = projectId ? `/${projectId}/loop-creator` : AUTH_ROUTE.PROJECTS
  const assetExporterHref = projectId ? `/${projectId}/asset-exporter` : AUTH_ROUTE.PROJECTS
  const interiorHref = projectId ? `/${projectId}/3d-canvas` : AUTH_ROUTE.PROJECTS

  return (
    <div id={TOUR_STEP_IDS.GLOBAL_SIDEBAR} className="w-16 h-screen bg-card border-r border-border flex flex-col items-center pt-2 pb-4 gap-4 z-50">
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
            src="/sidebar-mark.png"
            alt="Logo"
            className="w-full h-full object-contain relative z-10 transition-transform duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]"
          />
        </Link>
      </div>

      <Link href={storytellerHref}>
        <Button
          variant={isActive(storytellerHref) ? 'default' : 'ghost'}
          size="icon"
          title="Storyteller"
          className="w-10 h-10"
        >
          <BookOpen size={20} />
        </Button>
      </Link>

      <Link href={worldGenHref} id={TOUR_STEP_IDS.WORLD_GEN_NAV}>
        <Button
          variant={isActive(worldGenHref) ? 'default' : 'ghost'}
          size="icon"
          title="Infinite Canvas"
          className="w-10 h-10"
        >
          <Map size={20} />
        </Button>
      </Link>

      <Link href={assetExporterHref}>
        <Button
          variant={isActive(assetExporterHref) ? 'default' : 'ghost'}
          size="icon"
          title="3D Asset Exporter"
          className="w-10 h-10"
        >
          <Box size={20} />
        </Button>
      </Link>

      {is3dCanvasEnabled() ? (
        <Link href={interiorHref}>
          <Button
            variant={isActive(interiorHref) ? 'default' : 'ghost'}
            size="icon"
            title="3D Canvas"
            className="w-10 h-10"
          >
            <Home size={20} />
          </Button>
        </Link>
      ) : null}

      {isLoopCreatorEnabled() ? (
        <Link href={loopCreatorHref}>
          <Button
            variant={isActive(loopCreatorHref) ? 'default' : 'ghost'}
            size="icon"
            title="Loop Creator"
            className="w-10 h-10"
          >
            <Repeat size={20} />
          </Button>
        </Link>
      ) : null}

      <div className="mt-auto flex flex-col items-center">
        <AccountMenu />
      </div>
    </div>
  )
}
