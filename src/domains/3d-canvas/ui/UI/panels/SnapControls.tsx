'use client'

import { Slider } from '@/components/Slider'
import { Switch } from '@/components/Switch'
import { SidebarLabel } from '@/components/DomainSidebar'
import { useInteriorStore } from '@/domains/3d-canvas'

export function SnapControls() {
  const lockY = useInteriorStore(state => state.lockY)
  const setLockY = useInteriorStore(state => state.setLockY)
  const snapEnabled = useInteriorStore(state => state.snapEnabled)
  const setSnapEnabled = useInteriorStore(state => state.setSnapEnabled)
  const snapSize = useInteriorStore(state => state.snapSize)
  const setSnapSize = useInteriorStore(state => state.setSnapSize)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SidebarLabel>Lock Height (Y-Axis)</SidebarLabel>
        <Switch checked={lockY} onCheckedChange={setLockY} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SidebarLabel>Grid Snapping</SidebarLabel>
          <Switch checked={snapEnabled} onCheckedChange={setSnapEnabled} />
        </div>

        {snapEnabled && (
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Grid Size</span>
              <span>{snapSize}m</span>
            </div>
            <Slider
              value={[snapSize]}
              min={0.1}
              max={5}
              step={0.1}
              onValueChange={vals => setSnapSize(vals[0])}
            />
          </div>
        )}
      </div>
    </div>
  )
}
