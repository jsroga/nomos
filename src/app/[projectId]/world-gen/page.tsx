'use client'

import { Sidebar } from '@/domains/world-building-toolkit/components/Sidebar/Sidebar'
import { WorldCanvas } from '@/domains/world-building-toolkit/components/Canvas/WorldCanvas'
import { RepaintToolbar } from '@/domains/world-building-toolkit/components/RepaintToolbar'
import { SelectModeToolbar } from '@/domains/world-building-toolkit/components/SelectModeToolbar'
import { useProjectFromUrl } from '@/hooks/useProjectFromUrl'

export default function WorldBuildingPage() {
  // Load project from URL
  useProjectFromUrl()

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 relative">
        <WorldCanvas />

        <SelectModeToolbar />
      </div>
    </div>
  )
}
