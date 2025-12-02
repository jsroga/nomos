'use client'

import { Sidebar } from '@/domains/world-building-toolkit/components/Sidebar/Sidebar'
import { WorldCanvas } from '@/domains/world-building-toolkit/components/Canvas/WorldCanvas'
import { GenerationStatus } from '@/domains/world-building-toolkit/components/GenerationStatus'
import { RepaintToolbar } from '@/domains/world-building-toolkit/components/RepaintToolbar'
import { SelectModeToolbar } from '@/domains/world-building-toolkit/components/SelectModeToolbar'

export default function WorldBuildingPage() {
  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 relative">
        <WorldCanvas />
        <GenerationStatus />
        <RepaintToolbar />
        <SelectModeToolbar />
      </div>
    </div>
  )
}

