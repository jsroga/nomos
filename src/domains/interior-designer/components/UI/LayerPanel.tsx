'use client'

import React from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import { Layers, Square, Trash2, GitCommit, BrickWall, Box, Mountain, Droplets } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SidebarHeader, SidebarSection, SidebarEmptyState } from '@/components/ui/domain-sidebar'

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
        'flex items-center gap-2 px-2.5 py-2 mx-1 my-0.5 rounded-md cursor-pointer group transition-all duration-150',
        isSelected
          ? 'bg-indigo-500/20 border-l-2 border-indigo-500 text-indigo-400 shadow-sm'
          : 'bg-transparent hover:bg-muted/40 text-muted-foreground hover:text-foreground'
      )}
      onClick={handleClick}
    >
      {icon && (
        <div
          className={cn(
            'transition-colors duration-150 flex-shrink-0',
            isSelected ? 'text-indigo-400' : 'text-muted-foreground group-hover:text-foreground'
          )}
        >
          {icon}
        </div>
      )}

      <span className="text-[11px] font-mono font-medium uppercase tracking-wide flex-1 truncate">
        {name}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-6 w-6 transition-all duration-150 flex-shrink-0',
          isSelected
            ? 'opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10'
            : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10'
        )}
        onClick={e => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <Trash2 size={11} />
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
        <div className="flex-1 overflow-y-auto pb-0">
          {/* Terrain Foundation */}
          <SidebarSection
            title="Environment"
            icon={<Mountain size={12} className="text-muted-foreground" />}
            collapsible
            rightContent={
              <span className="text-[10px] font-mono font-semibold text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                {terrain.length + water.length}
              </span>
            }
          >
            <div className="space-y-1 pt-2">
              {terrain.length === 0 && water.length === 0 ? (
                <SidebarEmptyState message="No environment items" />
              ) : (
                <>
                  {terrain.map(s => (
                    <LayerItem
                      key={s.id}
                      id={s.id}
                      icon={
                        <Square
                          size={12}
                          className={cn(
                            selectedId === s.id ? 'text-indigo-400' : 'text-emerald-500/70'
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
                          className={cn(selectedId === s.id ? 'text-indigo-400' : 'text-cyan-500/70')}
                        />
                      }
                      name={`Water Body ${i + 1}`}
                      isSelected={selectedId === s.id || multiSelectedIds.includes(s.id)}
                      onSelect={() => setSelected(s.id)}
                      onShiftSelect={() => toggleMultiSelect(s.id)}
                      onDelete={() => removeSurface(s.id)}
                    />
                  ))}
                </>
              )}
            </div>
          </SidebarSection>

          {/* Infrastructure (Roads/Paths) */}
          <SidebarSection
            title="Infrastructure"
            icon={<GitCommit size={12} className="text-muted-foreground" />}
            collapsible
            rightContent={
              <span className="text-[10px] font-mono font-semibold text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                {roads.length}
              </span>
            }
            separator
          >
            <div className="space-y-1 pt-2">
              {roads.length === 0 ? (
                <SidebarEmptyState message="No infrastructure items" />
              ) : (
                roads.map((s, i) => (
                  <LayerItem
                    key={s.id}
                    id={s.id}
                    icon={
                      <GitCommit
                        size={12}
                        className={cn(selectedId === s.id ? 'text-indigo-400' : 'text-muted-foreground')}
                      />
                    }
                    name={s.isPath ? `Curve ${i + 1}` : `Road ${i + 1}`}
                    isSelected={selectedId === s.id || multiSelectedIds.includes(s.id)}
                    onSelect={() => setSelected(s.id)}
                    onShiftSelect={() => toggleMultiSelect(s.id)}
                    onDelete={() => removeSurface(s.id)}
                  />
                ))
              )}
            </div>
          </SidebarSection>

          {/* Envelope (Walls) */}
          <SidebarSection
            title="Envelope"
            icon={<BrickWall size={12} className="text-muted-foreground" />}
            collapsible
            rightContent={
              <span className="text-[10px] font-mono font-semibold text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                {walls.length + wallSurfaces.length}
              </span>
            }
            separator
          >
            <div className="space-y-1 pt-2">
              {wallSurfaces.map((s, i) => (
                <LayerItem
                  key={s.id}
                  id={s.id}
                  icon={
                    <BrickWall
                      size={12}
                      className={cn(selectedId === s.id ? 'text-indigo-400' : 'text-muted-foreground')}
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
            icon={<Square size={12} className="text-muted-foreground" />}
            collapsible
            rightContent={
              <span className="text-[10px] font-mono font-semibold text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                {floors.length}
              </span>
            }
            separator
          >
            <div className="space-y-1 pt-2">
              {floors.length === 0 ? (
                <SidebarEmptyState message="No surfaces" />
              ) : (
                floors.map((floor, i) => (
                  <LayerItem
                    key={floor.id}
                    id={floor.id}
                    icon={
                      <Square
                        size={12}
                        className={cn(selectedId === floor.id ? 'text-indigo-400' : 'text-muted-foreground')}
                      />
                    }
                    name={`Floor ${i + 1}`}
                    isSelected={selectedId === floor.id || multiSelectedIds.includes(floor.id)}
                    onSelect={() => setSelected(floor.id)}
                    onShiftSelect={() => toggleMultiSelect(floor.id)}
                    onDelete={() => removeFloor(floor.id)}
                  />
                ))
              )}
            </div>
          </SidebarSection>

          {/* Objects */}
          <SidebarSection
            title="Assets"
            icon={<Box size={12} className="text-muted-foreground" />}
            collapsible
            rightContent={
              <span className="text-[10px] font-mono font-semibold text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                {objects.length}
              </span>
            }
            separator
          >
            <div className="space-y-1 pt-2">
              {objects.length === 0 ? (
                <SidebarEmptyState message="No assets" />
              ) : (
                objects.map((obj, i) => (
                  <LayerItem
                    key={obj.id}
                    id={obj.id}
                    icon={
                      <Box
                        size={12}
                        className={cn(selectedId === obj.id ? 'text-indigo-400' : 'text-muted-foreground')}
                      />
                    }
                    name={obj.modelUrl.split('/').pop()?.replace('.glb', '') || `Asset ${i + 1}`}
                    isSelected={selectedId === obj.id || multiSelectedIds.includes(obj.id)}
                    onSelect={() => setSelected(obj.id)}
                    onShiftSelect={() => toggleMultiSelect(obj.id)}
                    onDelete={() => removeObject(obj.id)}
                  />
                ))
              )}
            </div>
          </SidebarSection>
        </div>
      </div>
    )
  }

  // Default Scene Graph View
  return (
    <div className="h-full flex flex-col bg-transparent">
      <div className="flex-1 overflow-y-auto pb-0">
        {/* Terrain Group */}
        <SidebarSection
          title="Terrain"
          icon={<Mountain size={12} className="text-muted-foreground" />}
          collapsible
          rightContent={
            <span className="text-[10px] font-mono font-semibold text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
              {terrain.length}
            </span>
          }
        >
          <div className="space-y-1 pt-2">
            {terrain.length === 0 ? (
              <SidebarEmptyState message="No terrain items" />
            ) : (
              terrain.map((s, i) => (
                <LayerItem
                  key={s.id}
                  id={s.id}
                  icon={
                    <Square
                      size={12}
                      className={cn(selectedId === s.id ? 'text-indigo-400' : 'text-muted-foreground')}
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
              ))
            )}
          </div>
        </SidebarSection>

        {/* Water Group */}
        <SidebarSection
          title="Hydrology"
          icon={<Droplets size={12} className="text-muted-foreground" />}
          collapsible
          rightContent={
            <span className="text-[10px] font-mono font-semibold text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
              {water.length}
            </span>
          }
          separator
        >
          <div className="space-y-1 pt-2">
            {water.length === 0 ? (
              <SidebarEmptyState message="No hydrology items" />
            ) : (
              water.map((s, i) => (
                <LayerItem
                  key={s.id}
                  id={s.id}
                  icon={
                    <Droplets
                      size={12}
                      className={cn(selectedId === s.id ? 'text-indigo-400' : 'text-cyan-500/70')}
                    />
                  }
                  name={`Hydrology ${i + 1}`}
                  isSelected={selectedId === s.id || multiSelectedIds.includes(s.id)}
                  onSelect={() => setSelected(s.id)}
                  onShiftSelect={() => toggleMultiSelect(s.id)}
                  onDelete={() => removeSurface(s.id)}
                />
              ))
            )}
          </div>
        </SidebarSection>

        {/* Infrastructure Group */}
        <SidebarSection
          title="Infrastructure"
          icon={<GitCommit size={12} className="text-muted-foreground" />}
          collapsible
          rightContent={
            <span className="text-[10px] font-mono font-semibold text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
              {roads.length}
            </span>
          }
          separator
        >
          <div className="space-y-1 pt-2">
            {roads.length === 0 ? (
              <SidebarEmptyState message="No infrastructure items" />
            ) : (
              roads.map((s, i) => (
                <LayerItem
                  key={s.id}
                  id={s.id}
                  icon={
                    <GitCommit
                      size={12}
                      className={cn(selectedId === s.id ? 'text-indigo-400' : 'text-muted-foreground')}
                    />
                  }
                  name={s.isPath ? `Curve ${i + 1}` : `Road ${i + 1}`}
                  isSelected={selectedId === s.id || multiSelectedIds.includes(s.id)}
                  onSelect={() => setSelected(s.id)}
                  onShiftSelect={() => toggleMultiSelect(s.id)}
                  onDelete={() => removeSurface(s.id)}
                />
              ))
            )}
          </div>
        </SidebarSection>

        {/* Envelope Group */}
          <SidebarSection
            title="Envelope"
            icon={<BrickWall size={12} className="text-muted-foreground" />}
            collapsible
            rightContent={
              <span className="text-[10px] font-mono font-semibold text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                {walls.length + wallSurfaces.length}
              </span>
            }
            separator
          >
            <div className="space-y-1 pt-2">
              {wallSurfaces.length === 0 && walls.length === 0 ? (
                <SidebarEmptyState message="No envelope items" />
              ) : (
                <>
                  {wallSurfaces.map((s, i) => (
                    <LayerItem
                      key={s.id}
                      id={s.id}
                      icon={
                        <BrickWall
                          size={12}
                          className={cn(selectedId === s.id ? 'text-indigo-400' : 'text-muted-foreground')}
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
                          className={cn(selectedId === wall.id ? 'text-indigo-400' : 'text-muted-foreground')}
                        />
                      }
                      name={`Draft Wall ${i + 1}`}
                      isSelected={selectedId === wall.id || multiSelectedIds.includes(wall.id)}
                      onSelect={() => setSelected(wall.id)}
                      onShiftSelect={() => toggleMultiSelect(wall.id)}
                      onDelete={() => removeWall(wall.id)}
                    />
                  ))}
                </>
              )}
            </div>
          </SidebarSection>

        {/* Floors Group */}
          <SidebarSection
            title="Surfaces"
            icon={<Square size={12} className="text-muted-foreground" />}
            collapsible
            rightContent={
              <span className="text-[10px] font-mono font-semibold text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                {floors.length}
              </span>
            }
            separator
          >
            <div className="space-y-1 pt-2">
              {floors.length === 0 ? (
                <SidebarEmptyState message="No surfaces" />
              ) : (
                floors.map((floor, i) => (
                  <LayerItem
                    key={floor.id}
                    id={floor.id}
                    icon={
                      <Square
                        size={12}
                        className={cn(selectedId === floor.id ? 'text-indigo-400' : 'text-muted-foreground')}
                      />
                    }
                    name={`Floor ${i + 1}`}
                    isSelected={selectedId === floor.id || multiSelectedIds.includes(floor.id)}
                    onSelect={() => setSelected(floor.id)}
                    onShiftSelect={() => toggleMultiSelect(floor.id)}
                    onDelete={() => removeFloor(floor.id)}
                  />
                ))
              )}
            </div>
          </SidebarSection>

        {/* Assets Group */}
        <SidebarSection
          title="Assets"
          icon={<Box size={14} className="text-zinc-500" />}
          collapsible
          rightContent={
            <span className="text-[10px] font-bold text-muted-foreground">{objects.length}</span>
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
      </div>
    </div>
  )
}
