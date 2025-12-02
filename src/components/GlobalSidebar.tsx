'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Box, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const GlobalSidebar = () => {
  const pathname = usePathname()

  const isActive = (path: string) => pathname?.startsWith(path)

  return (
    <div className="w-16 h-screen bg-card border-r border-border flex flex-col items-center py-4 gap-4 z-50">
      <div className="mb-4">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
          T
        </div>
      </div>

      <Link href="/world-building">
        <Button
          variant={isActive('/world-building') ? 'default' : 'ghost'}
          size="icon"
          title="World Building"
          className="w-10 h-10"
        >
          <Map size={20} />
        </Button>
      </Link>

      <Link href="/asset-exporter">
        <Button
          variant={isActive('/asset-exporter') ? 'default' : 'ghost'}
          size="icon"
          title="3D Asset Exporter"
          className="w-10 h-10"
        >
          <Box size={20} />
        </Button>
      </Link>

      <div className="mt-auto">
        {/* Settings or other global actions could go here */}
      </div>
    </div>
  )
}

