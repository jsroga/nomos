'use client'

import { Sidebar } from '@/components/Sidebar/Sidebar'
import { WorldCanvas } from '@/components/Canvas/WorldCanvas'
import { GenerationStatus } from '@/components/GenerationStatus'

export default function Home() {
  return (
    <main className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 relative">
        <WorldCanvas />
        <GenerationStatus />
      </div>
    </main>
  )
}
