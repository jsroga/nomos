'use client'

import { Sidebar } from '@/domains/world-building-toolkit/components/Sidebar/Sidebar'
import { WorldCanvas } from '@/domains/world-building-toolkit/components/Canvas/WorldCanvas'
import { GenerationStatus } from '@/domains/world-building-toolkit/components/GenerationStatus'
import { RepaintToolbar } from '@/domains/world-building-toolkit/components/RepaintToolbar'

export default function Home() {
  return (
    <main className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 relative">
        <WorldCanvas />
        <GenerationStatus />
        <RepaintToolbar />
      </div>
    </main>
  )
}
