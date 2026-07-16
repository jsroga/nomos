'use client'

import React from 'react'
import { Layers } from 'lucide-react'
import { Button } from '@/components/Button'
import { Slider } from '@/components/Slider'
import { SidebarSection, SidebarSliderRow } from '@/components/DomainSidebar'
import type { ObjectGroup, SceneObject, Wall } from '@/domains/interior-designer/core/interior-types'

interface MultiSelectionPanelProps {
  multiSelectedIds: string[]
  walls: Wall[]
  objects: SceneObject[]
  groups: ObjectGroup[]
  batchHeight: number
  setBatchHeight: (height: number) => void
  combineRoundness: number
  setCombineRoundness: (roundness: number) => void
  updateWall: (id: string, updates: Partial<Wall>) => void
  combineWalls: (options: { roundness: number }) => void
  createGroup: (name: string, memberIds: string[]) => void
}

export function MultiSelectionPanel({
  multiSelectedIds,
  walls,
  objects,
  groups,
  batchHeight,
  setBatchHeight,
  combineRoundness,
  setCombineRoundness,
  updateWall,
  combineWalls,
  createGroup,
}: MultiSelectionPanelProps) {
  const selectedWalls = walls.filter(w => multiSelectedIds.includes(w.id))
  const allAreWalls = selectedWalls.length === multiSelectedIds.length

  return (
    <div className="space-y-6">
      <SidebarSection
        title="Multi-Selection"
        rightContent={
          <span className="text-[10px] font-bold text-muted-foreground uppercase ml-2">
            {multiSelectedIds.length} items
          </span>
        }
      >
        {allAreWalls && (
          <div className="space-y-6 pt-2">
            <div className="space-y-3">
              <SidebarSliderRow
                label="Batch Height"
                value={batchHeight}
                min={0.5}
                max={10}
                step={0.5}
                onChange={h => {
                  setBatchHeight(h)
                  multiSelectedIds.forEach(id => updateWall(id, { height: h }))
                }}
                formatValue={val => `${val.toFixed(1)}m`}
              />
              <Slider
                value={[batchHeight]}
                min={0.5}
                max={10}
                step={0.5}
                onValueChange={vals => {
                  const h = vals[0]
                  setBatchHeight(h)
                  multiSelectedIds.forEach(id => updateWall(id, { height: h }))
                }}
              />
            </div>

            <div className="pt-6 border-t border-border space-y-6">
              <div className="space-y-2">
                <SidebarSliderRow
                  label="Combine Roundness"
                  value={combineRoundness}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={setCombineRoundness}
                  formatValue={val => val.toFixed(2)}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                  <span>Sharp</span>
                  <span>Round</span>
                </div>
              </div>

              <Button
                onClick={() => combineWalls({ roundness: combineRoundness })}
                variant="default"
                className="w-full font-mono text-[10px] uppercase tracking-widest py-3 flex items-center justify-center gap-2"
              >
                <Layers size={14} />
                Combine Walls
              </Button>

              <div className="text-[10px] text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border leading-relaxed text-center">
                Merges selected walls into a single curved surface with the specified roundness.
              </div>
            </div>
          </div>
        )}

        {!allAreWalls && (
          <div className="space-y-4 pt-2">
            <div className="text-[10px] text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border text-center">
              {multiSelectedIds.length} items selected
            </div>

            {multiSelectedIds.some(id => objects.find(o => o.id === id)) && (
              <Button
                onClick={() => {
                  const name = `Group ${groups.length + 1}`
                  createGroup(name, multiSelectedIds)
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(79,70,229,0.3)]"
              >
                <Layers size={14} />
                Create Group
              </Button>
            )}
          </div>
        )}
      </SidebarSection>
    </div>
  )
}
