'use client'

import React from 'react'
import type { Floor, SceneObject, Wall } from '@/domains/3d-canvas'
import { Square, GitCommit, BrickWall, Box, Mountain, Droplets } from 'lucide-react'
import { cn } from '@/shared/data/utils'
import { SidebarSection, SidebarEmptyState } from '@/components/DomainSidebar'
import { LayerItem } from './LayerItem'
import { getLayerTerrainIconColor } from './constants/layer-terrain-icon-colors'
import type { LayerPanelActions } from './LayerPanelTerrainView'
import type { LayerSurfaceGroups } from './utils/partition-layer-surfaces'

type LayerPanelSceneViewProps = {
  groups: LayerSurfaceGroups
  walls: Wall[]
  floors: Floor[]
  objects: SceneObject[]
  actions: LayerPanelActions
}

function isItemSelected(id: string, actions: LayerPanelActions): boolean {
  return actions.selectedId === id || actions.multiSelectedIds.includes(id)
}

export const LayerPanelSceneView: React.FC<LayerPanelSceneViewProps> = ({
  groups,
  walls,
  floors,
  objects,
  actions,
}) => {
  const { terrain, water, roads, wallSurfaces } = groups

  return (
    <div className="h-full flex flex-col bg-transparent">
      <div className="flex-1 overflow-y-auto pb-0">
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
              terrain.map(s => (
                <LayerItem
                  key={s.id}
                  id={s.id}
                  icon={
                    <Square
                      size={12}
                      className={cn(isItemSelected(s.id, actions) ? 'text-indigo-400' : 'text-muted-foreground')}
                      style={{ color: getLayerTerrainIconColor(s.type, isItemSelected(s.id, actions)) }}
                    />
                  }
                  name={`${s.type} foundation`}
                  isSelected={isItemSelected(s.id, actions)}
                  onSelect={() => actions.setSelected(s.id)}
                  onShiftSelect={() => actions.toggleMultiSelect(s.id)}
                  onDelete={() => actions.removeSurface(s.id)}
                />
              ))
            )}
          </div>
        </SidebarSection>

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
                      className={cn(isItemSelected(s.id, actions) ? 'text-indigo-400' : 'text-cyan-500/70')}
                    />
                  }
                  name={`Hydrology ${i + 1}`}
                  isSelected={isItemSelected(s.id, actions)}
                  onSelect={() => actions.setSelected(s.id)}
                  onShiftSelect={() => actions.toggleMultiSelect(s.id)}
                  onDelete={() => actions.removeSurface(s.id)}
                />
              ))
            )}
          </div>
        </SidebarSection>

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
                      className={cn(isItemSelected(s.id, actions) ? 'text-indigo-400' : 'text-muted-foreground')}
                    />
                  }
                  name={s.isPath ? `Curve ${i + 1}` : `Road ${i + 1}`}
                  isSelected={isItemSelected(s.id, actions)}
                  onSelect={() => actions.setSelected(s.id)}
                  onShiftSelect={() => actions.toggleMultiSelect(s.id)}
                  onDelete={() => actions.removeSurface(s.id)}
                />
              ))
            )}
          </div>
        </SidebarSection>

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
                        className={cn(isItemSelected(s.id, actions) ? 'text-indigo-400' : 'text-muted-foreground')}
                      />
                    }
                    name={`PBR Wall ${i + 1}`}
                    isSelected={isItemSelected(s.id, actions)}
                    onSelect={() => actions.setSelected(s.id)}
                    onShiftSelect={() => actions.toggleMultiSelect(s.id)}
                    onDelete={() => actions.removeSurface(s.id)}
                  />
                ))}
                {walls.map((wall, i) => (
                  <LayerItem
                    key={wall.id}
                    id={wall.id}
                    icon={
                      <BrickWall
                        size={12}
                        className={cn(isItemSelected(wall.id, actions) ? 'text-indigo-400' : 'text-muted-foreground')}
                      />
                    }
                    name={`Draft Wall ${i + 1}`}
                    isSelected={isItemSelected(wall.id, actions)}
                    onSelect={() => actions.setSelected(wall.id)}
                    onShiftSelect={() => actions.toggleMultiSelect(wall.id)}
                    onDelete={() => actions.removeWall(wall.id)}
                  />
                ))}
              </>
            )}
          </div>
        </SidebarSection>

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
                      className={cn(isItemSelected(floor.id, actions) ? 'text-indigo-400' : 'text-muted-foreground')}
                    />
                  }
                  name={`Floor ${i + 1}`}
                  isSelected={isItemSelected(floor.id, actions)}
                  onSelect={() => actions.setSelected(floor.id)}
                  onShiftSelect={() => actions.toggleMultiSelect(floor.id)}
                  onDelete={() => actions.removeFloor(floor.id)}
                />
              ))
            )}
          </div>
        </SidebarSection>

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
                    className={cn(isItemSelected(obj.id, actions) ? 'text-indigo-600' : 'text-zinc-600')}
                  />
                }
                name={obj.modelUrl.split('/').pop()?.replace('.glb', '') || `Asset ${i + 1}`}
                isSelected={isItemSelected(obj.id, actions)}
                onSelect={() => actions.setSelected(obj.id)}
                onShiftSelect={() => actions.toggleMultiSelect(obj.id)}
                onDelete={() => actions.removeObject(obj.id)}
              />
            ))}
          </div>
        </SidebarSection>
      </div>
    </div>
  )
}
