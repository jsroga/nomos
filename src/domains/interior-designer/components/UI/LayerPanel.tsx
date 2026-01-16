'use client'

import React from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import {
  Layers,
  Square,
  Trash2,
  Eye,
  EyeOff,
  GitCommit,
  BrickWall,
  Box,
  Mountain,
  Droplets,
  ChevronDown,
  Map,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SidebarHeader, SidebarSection } from '@/components/ui/domain-sidebar'

interface LayerItemProps {
  id: string
  name: string
  icon?: React.ReactNode
  isSelected: boolean
  onSelect: () => void
  onShiftSelect?: () => void
  onDelete: () => void
}

const LayerItem: React.FC<LayerItemProps> = ({
  name,
  icon,
  isSelected,
  onSelect,
  onShiftSelect,
  onDelete,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey && onShiftSelect) {
      onShiftSelect()
    } else {
      onSelect()
    }
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 px-3 py-1.5 mx-2 my-0.5 rounded-2xl cursor-pointer group transition-all duration-300 border',
        isSelected
          ? 'bg-indigo-600 border-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]'
          : 'bg-white/3 border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/5 hover:border-white/5'
      )}
      onClick={handleClick}
    >
      <div
        className={cn(
          'w-1 h-3 rounded-full transition-all duration-300',
          isSelected
            ? 'bg-white scale-100 shadow-[0_0_8px_white]'
            : 'bg-zinc-800 scale-50 group-hover:scale-100 group-hover:bg-zinc-600'
        )}
      />

      {icon && (
        <div
          className={cn(
            'transition-transform duration-300',
            !isSelected && 'group-hover:scale-110'
          )}
        >
          {icon}
        </div>
      )}

      <span className="text-[10px] font-mono font-bold uppercase tracking-widest flex-1 truncate">
        {name}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-6 w-6 transition-all duration-300',
          isSelected
            ? 'text-zinc-600 hover:text-red-600 hover:bg-red-500/10'
            : 'opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 hover:bg-white/5'
        )}
        onClick={e => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <Trash2 size={12} />
      </Button>
    </div>
  )
}

export const LayerPanel: React.FC = () => {
  const mode = useInteriorStore(state => state.mode)
  const walls = useInteriorStore(state => state.walls)
  const floors = useInteriorStore(state => state.floors)
  const surfaces = useInteriorStore(state => state.surfaces)
  const objects = useInteriorStore(state => state.objects)
  const selectedId = useInteriorStore(state => state.selectedId)
  const multiSelectedIds = useInteriorStore(state => state.multiSelectedIds)

  const setSelected = useInteriorStore(state => state.setSelected)
  const toggleMultiSelect = useInteriorStore(state => state.toggleMultiSelect)
  const removeWall = useInteriorStore(state => state.removeWall)
  const removeFloor = useInteriorStore(state => state.removeFloor)
  const removeSurface = useInteriorStore(state => state.removeSurface)
  const removeObject = useInteriorStore(state => state.removeObject)

  // Derived groups
  const terrain = surfaces.filter(s => ['grass', 'dirt', 'sand', 'rock', 'mars'].includes(s.type))
  const water = surfaces.filter(s => s.type === 'water')
  const roads = surfaces.filter(s => s.type === 'road' || s.isPath)
  const wallSurfaces = surfaces.filter(s => s.type === 'wall')

  if (mode === 'TERRAIN') {
    return (
      <div className="h-full flex flex-col bg-transparent">
        <div className="px-5 pt-6 pb-2 flex items-center gap-2 border-b border-white/5 mb-2">
          <Layers size={14} className="text-indigo-400/80" />
          <SidebarHeader className="text-zinc-100 font-mono font-bold uppercase text-[10px] tracking-widest">
            Scene Explorer
          </SidebarHeader>
        </div>

        <ScrollArea className="flex-1">
          {/* Terrain Foundation */}
          <SidebarSection
            title="Environment"
            icon={<Mountain size={12} className="text-zinc-500" />}
            collapsible
            rightContent={
              <span className="text-[10px] font-bold text-zinc-600">
                {terrain.length + water.length}
              </span>
            }
          >
            <div className="space-y-2 pt-1.5">
              {terrain.map(s => (
                <LayerItem
                  key={s.id}
                  id={s.id}
                  icon={
                    <Square
                      size={12}
                      className={cn(
                        selectedId === s.id ? 'text-indigo-600' : 'text-emerald-500/60'
                      )}
                    />
                  }
                  name={`${s.type} foundation`}
                  isSelected={selectedId === s.id || multiSelectedIds.includes(s.id)}
                  onSelect={() => setSelected(s.id)}
                  onShiftSelect={() => toggleMultiSelect(s.id)}
                  onDelete={() => removeSurface(s.id)}
                />
              ))}
              {water.map((s, i) => (
                <LayerItem
                  key={s.id}
                  id={s.id}
                  icon={
                    <Droplets
                      size={12}
                      className={cn(selectedId === s.id ? 'text-indigo-600' : 'text-cyan-500/60')}
                    />
                  }
                  name={`Water Body ${i + 1}`}
                  isSelected={selectedId === s.id || multiSelectedIds.includes(s.id)}
                  onSelect={() => setSelected(s.id)}
                  onShiftSelect={() => toggleMultiSelect(s.id)}
                  onDelete={() => removeSurface(s.id)}
                />
              ))}
            </div>
          </SidebarSection>

          {/* Infrastructure (Roads/Paths) */}
          <SidebarSection
            title="Infrastructure"
            icon={<GitCommit size={12} className="text-zinc-500" />}
            collapsible
            rightContent={
              <span className="text-[10px] font-bold text-zinc-600">{roads.length}</span>
            }
            separator
          >
            <div className="space-y-2 pt-1.5">
              {roads.map((s, i) => (
                <LayerItem
                  key={s.id}
                  id={s.id}
                  icon={
                    <GitCommit
                      size={12}
                      className={cn(selectedId === s.id ? 'text-indigo-600' : 'text-zinc-600')}
                    />
                  }
                  name={s.isPath ? `Curve ${i + 1}` : `Road ${i + 1}`}
                  isSelected={selectedId === s.id || multiSelectedIds.includes(s.id)}
                  onSelect={() => setSelected(s.id)}
                  onShiftSelect={() => toggleMultiSelect(s.id)}
                  onDelete={() => removeSurface(s.id)}
                />
              ))}
            </div>
          </SidebarSection>

          {/* Envelope (Walls) */}
          <SidebarSection
            title="Envelope"
            icon={<BrickWall size={12} className="text-zinc-500" />}
            collapsible
            rightContent={
              <span className="text-[10px] font-bold text-zinc-600">
                {walls.length + wallSurfaces.length}
              </span>
            }
            separator
          >
            <div className="space-y-2 pt-1.5">
              {wallSurfaces.map((s, i) => (
                <LayerItem
                  key={s.id}
                  id={s.id}
                  icon={
                    <BrickWall
                      size={12}
                      className={cn(selectedId === s.id ? 'text-indigo-600' : 'text-zinc-600')}
                    />
                  }
                  name={`PBR Wall ${i + 1}`}
                  isSelected={selectedId === s.id || multiSelectedIds.includes(s.id)}
                  onSelect={() => setSelected(s.id)}
                  onShiftSelect={() => toggleMultiSelect(s.id)}
                  onDelete={() => removeSurface(s.id)}
                />
              ))}
              {walls.map((wall, i) => (
                <LayerItem
                  key={wall.id}
                  id={wall.id}
                  icon={
                    <BrickWall
                      size={12}
                      className={cn(selectedId === wall.id ? 'text-indigo-600' : 'text-zinc-600')}
                    />
                  }
                  name={`Draft Wall ${i + 1}`}
                  isSelected={selectedId === wall.id || multiSelectedIds.includes(wall.id)}
                  onSelect={() => setSelected(wall.id)}
                  onShiftSelect={() => toggleMultiSelect(wall.id)}
                  onDelete={() => removeWall(wall.id)}
                />
              ))}
            </div>
          </SidebarSection>

          {/* Floors */}
          <SidebarSection
            title="Surfaces"
            icon={<Square size={12} className="text-zinc-500" />}
            collapsible
            rightContent={
              <span className="text-[10px] font-bold text-zinc-600">{floors.length}</span>
            }
            separator
          >
            <div className="space-y-2 pt-1.5">
              {floors.map((floor, i) => (
                <LayerItem
                  key={floor.id}
                  id={floor.id}
                  icon={
                    <Square
                      size={12}
                      className={cn(selectedId === floor.id ? 'text-indigo-600' : 'text-zinc-600')}
                    />
                  }
                  name={`Floor ${i + 1}`}
                  isSelected={selectedId === floor.id || multiSelectedIds.includes(floor.id)}
                  onSelect={() => setSelected(floor.id)}
                  onShiftSelect={() => toggleMultiSelect(floor.id)}
                  onDelete={() => removeFloor(floor.id)}
                />
              ))}
            </div>
          </SidebarSection>

          {/* Objects */}
          <SidebarSection
            title="Assets"
            icon={<Box size={12} className="text-zinc-500" />}
            collapsible
            rightContent={
              <span className="text-[10px] font-bold text-zinc-600">{objects.length}</span>
            }
            separator
          >
            <div className="space-y-2 pt-1.5">
              {objects.map((obj, i) => (
                <LayerItem
                  key={obj.id}
                  id={obj.id}
                  icon={
                    <Box
                      size={12}
                      className={cn(selectedId === obj.id ? 'text-indigo-600' : 'text-zinc-600')}
                    />
                  }
                  name={obj.modelUrl.split('/').pop()?.replace('.glb', '') || `Asset ${i + 1}`}
                  isSelected={selectedId === obj.id || multiSelectedIds.includes(obj.id)}
                  onSelect={() => setSelected(obj.id)}
                  onShiftSelect={() => toggleMultiSelect(obj.id)}
                  onDelete={() => removeObject(obj.id)}
                />
              ))}
            </div>
          </SidebarSection>
        </ScrollArea>
      </div>
    )
  }

  // Default Scene Graph View
  return (
    <div className="h-full flex flex-col bg-transparent">
      <div className="px-5 pt-6 pb-2 flex items-center gap-2 border-b border-border/50 mb-2">
        <Layers size={12} className="text-indigo-400/90" />
        <SidebarHeader className="text-indigo-400/90 font-mono font-bold uppercase text-xs tracking-widest">
          Scene Explorer
        </SidebarHeader>
      </div>
      <ScrollArea className="flex-1">
        {/* Terrain Group */}
        <SidebarSection
          title="Terrain"
          icon={<Mountain size={12} className="text-zinc-500" />}
          collapsible
          rightContent={
            <span className="text-[10px] font-bold text-zinc-600">{terrain.length}</span>
          }
        >
          <div className="space-y-2 pt-1.5">
            {terrain.map((s, i) => (
              <LayerItem
                key={s.id}
                id={s.id}
                icon={
                  <Square
                    size={12}
                    className={cn(selectedId === s.id ? 'text-indigo-600' : 'text-zinc-600')}
                    style={{
                      color:
                        selectedId === s.id
                          ? undefined
                          : s.type === 'grass'
                            ? '#22c55e'
                            : s.type === 'mars'
                              ? '#ef4444'
                              : s.type === 'sand'
                                ? '#eab308'
                                : s.type === 'rock'
                                  ? '#71717a'
                                  : undefined,
                    }}
                  />
                }
                name={`${s.type} foundation`}
                isSelected={selectedId === s.id || multiSelectedIds.includes(s.id)}
                onSelect={() => setSelected(s.id)}
                onShiftSelect={() => toggleMultiSelect(s.id)}
                onDelete={() => removeSurface(s.id)}
              />
            ))}
          </div>
        </SidebarSection>

        {/* Water Group */}
        <SidebarSection
          title="Hydrology"
          icon={<Droplets size={12} className="text-zinc-500" />}
          collapsible
          rightContent={<span className="text-[10px] font-bold text-zinc-600">{water.length}</span>}
          separator
        >
          <div className="space-y-2 pt-1.5">
            {water.map((s, i) => (
              <LayerItem
                key={s.id}
                id={s.id}
                icon={
                  <Droplets
                    size={12}
                    className={cn(selectedId === s.id ? 'text-indigo-600' : 'text-cyan-500/60')}
                  />
                }
                name={`Hydrology ${i + 1}`}
                isSelected={selectedId === s.id || multiSelectedIds.includes(s.id)}
                onSelect={() => setSelected(s.id)}
                onShiftSelect={() => toggleMultiSelect(s.id)}
                onDelete={() => removeSurface(s.id)}
              />
            ))}
          </div>
        </SidebarSection>

        {/* Infrastructure Group */}
        <SidebarSection
          title="Infrastructure"
          icon={<GitCommit size={12} className="text-zinc-500" />}
          collapsible
          rightContent={<span className="text-[10px] font-bold text-zinc-600">{roads.length}</span>}
          separator
        >
          <div className="space-y-2 pt-1.5">
            {roads.map((s, i) => (
              <LayerItem
                key={s.id}
                id={s.id}
                icon={
                  <GitCommit
                    size={12}
                    className={cn(selectedId === s.id ? 'text-indigo-600' : 'text-zinc-600')}
                  />
                }
                name={s.isPath ? `Curve ${i + 1}` : `Road ${i + 1}`}
                isSelected={selectedId === s.id || multiSelectedIds.includes(s.id)}
                onSelect={() => setSelected(s.id)}
                onShiftSelect={() => toggleMultiSelect(s.id)}
                onDelete={() => removeSurface(s.id)}
              />
            ))}
          </div>
        </SidebarSection>

        {/* Envelope Group */}
        <SidebarSection
          title="Envelope"
          icon={<BrickWall size={12} className="text-zinc-500" />}
          collapsible
          rightContent={
            <span className="text-[10px] font-bold text-zinc-600">
              {walls.length + wallSurfaces.length}
            </span>
          }
          separator
        >
          <div className="space-y-2 pt-1.5">
            {wallSurfaces.map((s, i) => (
              <LayerItem
                key={s.id}
                id={s.id}
                icon={
                  <BrickWall
                    size={12}
                    className={cn(selectedId === s.id ? 'text-indigo-600' : 'text-zinc-600')}
                  />
                }
                name={`PBR Wall ${i + 1}`}
                isSelected={selectedId === s.id || multiSelectedIds.includes(s.id)}
                onSelect={() => setSelected(s.id)}
                onShiftSelect={() => toggleMultiSelect(s.id)}
                onDelete={() => removeSurface(s.id)}
              />
            ))}
            {walls.map((wall, i) => (
              <LayerItem
                key={wall.id}
                id={wall.id}
                icon={
                  <BrickWall
                    size={12}
                    className={cn(selectedId === wall.id ? 'text-indigo-600' : 'text-zinc-600')}
                  />
                }
                name={`Draft Wall ${i + 1}`}
                isSelected={selectedId === wall.id || multiSelectedIds.includes(wall.id)}
                onSelect={() => setSelected(wall.id)}
                onShiftSelect={() => toggleMultiSelect(wall.id)}
                onDelete={() => removeWall(wall.id)}
              />
            ))}
          </div>
        </SidebarSection>

        {/* Floors Group */}
        <SidebarSection
          title="Surfaces"
          icon={<Square size={12} className="text-zinc-500" />}
          collapsible
          rightContent={
            <span className="text-[10px] font-bold text-zinc-600">{floors.length}</span>
          }
          separator
        >
          <div className="space-y-2 pt-1.5">
            {floors.map((floor, i) => (
              <LayerItem
                key={floor.id}
                id={floor.id}
                icon={
                  <Square
                    size={12}
                    className={cn(selectedId === floor.id ? 'text-indigo-600' : 'text-zinc-600')}
                  />
                }
                name={`Floor ${i + 1}`}
                isSelected={selectedId === floor.id || multiSelectedIds.includes(floor.id)}
                onSelect={() => setSelected(floor.id)}
                onShiftSelect={() => toggleMultiSelect(floor.id)}
                onDelete={() => removeFloor(floor.id)}
              />
            ))}
          </div>
        </SidebarSection>

        {/* Assets Group */}
        <SidebarSection
          title="Assets"
          icon={<Box size={12} className="text-zinc-500" />}
          collapsible
          rightContent={
            <span className="text-[10px] font-bold text-zinc-600">{objects.length}</span>
          }
          separator
        >
          <div className="space-y-2 pt-1.5">
            {objects.map((obj, i) => (
              <LayerItem
                key={obj.id}
                id={obj.id}
                icon={
                  <Box
                    size={12}
                    className={cn(selectedId === obj.id ? 'text-indigo-600' : 'text-zinc-600')}
                  />
                }
                name={obj.modelUrl.split('/').pop()?.replace('.glb', '') || `Asset ${i + 1}`}
                isSelected={selectedId === obj.id || multiSelectedIds.includes(obj.id)}
                onSelect={() => setSelected(obj.id)}
                onShiftSelect={() => toggleMultiSelect(obj.id)}
                onDelete={() => removeObject(obj.id)}
              />
            ))}
          </div>
        </SidebarSection>
      </ScrollArea>
    </div>
  )
}
