'use client'

import React from 'react'
import { Sparkles } from 'lucide-react'
import { SidebarEmptyState, SidebarSection } from '@/components/DomainSidebar'
import { useInteriorStore } from '@/domains/interior-designer'
import { InteriorDefaultProjectId } from '@/domains/interior-designer/constants/interior-api-defaults'
import { INTERACTION_MODE_TERRAIN } from '@/domains/interior-designer/constants/interaction-modes'
import { MultiSelectionPanel } from '@/domains/interior-designer/ui/UI/panels/MultiSelectionPanel'
import { SelectedItemProperties } from '@/domains/interior-designer/ui/UI/panels/SelectedItemProperties'
import { SnapControls } from '@/domains/interior-designer/ui/UI/panels/SnapControls'
import { SurfaceProperties } from '@/domains/interior-designer/ui/UI/SurfaceProperties'
import { TerrainEditorPanel } from '@/domains/interior-designer/ui/UI/TerrainEditorPanel'
import { useProjectFromUrl } from '@/shared/data/useProjectFromUrl'

export const PropertiesPanel: React.FC = () => {
  const { projectId } = useProjectFromUrl()
  const resolvedProjectId = projectId ?? InteriorDefaultProjectId.Default

  const selectedId = useInteriorStore(state => state.selectedId)
  const mode = useInteriorStore(state => state.mode)
  const setSelected = useInteriorStore(state => state.setSelected)

  const walls = useInteriorStore(state => state.walls)
  const floors = useInteriorStore(state => state.floors)
  const surfaces = useInteriorStore(state => state.surfaces)
  const objects = useInteriorStore(state => state.objects)

  const removeWall = useInteriorStore(state => state.removeWall)
  const removeFloor = useInteriorStore(state => state.removeFloor)
  const removeSurface = useInteriorStore(state => state.removeSurface)
  const removeObject = useInteriorStore(state => state.removeObject)

  const updateWall = useInteriorStore(state => state.updateWall)
  const multiSelectedIds = useInteriorStore(state => state.multiSelectedIds)
  const combineWalls = useInteriorStore(state => state.combineWalls)
  const groups = useInteriorStore(state => state.groups)
  const createGroup = useInteriorStore(state => state.createGroup)

  const [combineRoundness, setCombineRoundness] = React.useState(0.2)
  const [batchHeight, setBatchHeight] = React.useState(3)

  const selectedSurface = selectedId ? surfaces.find(s => s.id === selectedId) : null

  if (mode === INTERACTION_MODE_TERRAIN) {
    return <TerrainEditorPanel />
  }

  if (selectedSurface) {
    return <SurfaceProperties />
  }

  const selectedItem =
    walls.find(w => w.id === selectedId) ||
    floors.find(f => f.id === selectedId) ||
    objects.find(o => o.id === selectedId)

  if (multiSelectedIds.length > 1) {
    return (
      <MultiSelectionPanel
        multiSelectedIds={multiSelectedIds}
        walls={walls}
        objects={objects}
        groups={groups}
        batchHeight={batchHeight}
        setBatchHeight={setBatchHeight}
        combineRoundness={combineRoundness}
        setCombineRoundness={setCombineRoundness}
        updateWall={updateWall}
        combineWalls={combineWalls}
        createGroup={createGroup}
      />
    )
  }

  const handleDelete = () => {
    if (!selectedId) return
    if (walls.find(w => w.id === selectedId)) removeWall(selectedId)
    else if (floors.find(f => f.id === selectedId)) removeFloor(selectedId)
    else if (objects.find(o => o.id === selectedId)) removeObject(selectedId)
    else if (surfaces.find(s => s.id === selectedId)) removeSurface(selectedId)
    setSelected(null)
  }

  return (
    <div className="space-y-6">
      <SidebarSection
        title="Element Properties"
        className="px-1"
        icon={<Sparkles size={14} className="text-indigo-400" />}
      >
        <div className="space-y-6 pt-4">
          {mode === 'OBJECT' && !selectedId && (
            <div className="space-y-6">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-4 flex items-center gap-2">
                <div className="h-px bg-white/10 flex-1" />
                Object Placement
                <div className="h-px bg-white/10 flex-1" />
              </div>
              <SnapControls />
            </div>
          )}

          {!selectedId && mode !== 'OBJECT' && (
            <SidebarEmptyState
              message={mode === 'SELECT' ? 'Select an object to edit properties' : `Mode: ${mode}`}
            />
          )}

          {selectedItem && (
            <SelectedItemProperties
              selectedItem={selectedItem}
              mode={mode}
              projectId={resolvedProjectId}
              onDelete={handleDelete}
            />
          )}
        </div>
      </SidebarSection>
    </div>
  )
}
