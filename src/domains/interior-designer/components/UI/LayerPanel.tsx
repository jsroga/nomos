'use client'

import React, { useState } from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore' // Ensure import is there
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    ChevronDown,
    ChevronRight,
    Layers,
    Square,
    Box,
    Trash2,
    Eye,
    EyeOff,
    Mountain,
    Droplets,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarSection, SidebarHeader } from '@/components/ui/domain-sidebar'



interface LayerItemProps {
    id: string
    name: string
    isSelected: boolean
    onSelect: () => void
    onShiftSelect?: () => void
    onDelete: () => void
}

const LayerItem: React.FC<LayerItemProps> = ({
    id,
    name,
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
                'flex items-center gap-3 px-3 py-2 mx-2 rounded-md cursor-pointer group transition-colors duration-200',
                isSelected ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-sm' : 'hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-transparent hover:border-zinc-800'
            )}
            onClick={handleClick}
        >
            <span className="text-xs font-medium flex-1 truncate">{name}</span>
            <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
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

// Static layer item for terrain mode (non-deletable)
const StaticLayerItem: React.FC<{ name: string; icon?: React.ReactNode }> = ({ name, icon }) => {
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 mx-2 rounded text-muted-foreground">
            {icon}
            <span className="text-xs font-medium flex-1 truncate">{name}</span>
        </div>
    )
}

export const LayerPanel: React.FC = () => {
    const mode = useInteriorStore(state => state.mode)
    const surfaces = useInteriorStore(state => state.surfaces)
    const walls = useInteriorStore(state => state.walls)
    const floors = useInteriorStore(state => state.floors)
    const objects = useInteriorStore(state => state.objects)
    const selectedId = useInteriorStore(state => state.selectedId)
    const multiSelectedIds = useInteriorStore(state => state.multiSelectedIds)
    const setSelected = useInteriorStore(state => state.setSelected)
    const toggleMultiSelect = useInteriorStore(state => state.toggleMultiSelect)
    const removeSurface = useInteriorStore(state => state.removeSurface)
    const removeWall = useInteriorStore(state => state.removeWall)
    const removeFloor = useInteriorStore(state => state.removeFloor)
    const removeObject = useInteriorStore(state => state.removeObject)
    const terrainSettings = useInteriorStore(state => state.terrainSettings)


    // Group surfaces by type
    const terrain = surfaces.filter(s => ['grass', 'mars', 'sand', 'dirt', 'rock'].includes(s.type) && !s.isPath)
    const roads = surfaces.filter(s => (['road', 'pavement'].includes(s.type) || s.isPath) && !s.isVertical)
    const water = surfaces.filter(s => s.type === 'water')
    const wallSurfaces = surfaces.filter(s => s.isVertical) // Combined walls


    // Render terrain mode scene graph
    if (mode === 'TERRAIN') {
        return (
            <div className="h-full flex flex-col bg-transparent">
                <div className="px-4 pt-4 pb-2 flex items-center gap-1.5">
                    <Layers size={12} className="text-muted-foreground" />
                    <SidebarHeader>Scene Graph</SidebarHeader>
                </div>
                <ScrollArea className="flex-1">
                    {/* Environment Mesh Section */}
                    <SidebarSection
                        title="Environment Mesh"
                        icon={<Mountain size={14} className="text-emerald-500" />}
                        collapsible
                        rightContent={<span className="text-xs font-mono text-muted-foreground">2</span>}
                    >
                        <StaticLayerItem
                            name="Global Water Plane"
                            icon={<Droplets size={12} className="text-cyan-500" />}
                        />
                    </SidebarSection>

                    {/* Roads & Paths (still editable) */}
                    <SidebarSection
                        title="Roads & Paths"
                        icon={<Square size={14} className="text-slate-500" />}
                        collapsible
                        rightContent={<span className="text-xs font-mono text-muted-foreground">{roads.length}</span>}
                        separator
                    >
                        {roads.map((s, i) => (
                            <LayerItem
                                key={s.id}
                                id={s.id}
                                name={`${s.type.charAt(0).toUpperCase() + s.type.slice(1)} ${i + 1}`}
                                isSelected={selectedId === s.id || multiSelectedIds.includes(s.id)}
                                onSelect={() => setSelected(s.id)}
                                onShiftSelect={() => toggleMultiSelect(s.id)}
                                onDelete={() => removeSurface(s.id)}
                            />
                        ))}
                    </SidebarSection>

                    {/* Walls (Combined wall surfaces + individual walls) */}
                    <SidebarSection
                        title="Walls"
                        icon={<Square size={14} className="text-amber-600" />}
                        collapsible
                        rightContent={<span className="text-xs font-mono text-muted-foreground">{wallSurfaces.length + walls.length}</span>}
                        separator
                    >
                        {wallSurfaces.map((s, i) => (
                            <LayerItem
                                key={s.id}
                                id={s.id}
                                name={`Combined Wall ${i + 1}`}
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
                                name={`Wall Segment ${i + 1}`}
                                isSelected={selectedId === wall.id || multiSelectedIds.includes(wall.id)}
                                onSelect={() => setSelected(wall.id)}
                                onShiftSelect={() => toggleMultiSelect(wall.id)}
                                onDelete={() => removeWall(wall.id)}
                            />
                        ))}
                    </SidebarSection>



                    {/* Floors (walls are now in their own section) */}
                    <SidebarSection
                        title="Floors"
                        icon={<Square size={14} className="text-orange-500" />}
                        collapsible
                        rightContent={<span className="text-xs font-mono text-muted-foreground">{floors.length}</span>}
                        separator
                    >
                        {floors.map((floor, i) => (
                            <LayerItem
                                key={floor.id}
                                id={floor.id}
                                name={`Floor ${i + 1}`}
                                isSelected={selectedId === floor.id || multiSelectedIds.includes(floor.id)}
                                onSelect={() => setSelected(floor.id)}
                                onShiftSelect={() => toggleMultiSelect(floor.id)}
                                onDelete={() => removeFloor(floor.id)}
                            />
                        ))}
                    </SidebarSection>


                    {/* Objects */}
                    <SidebarSection
                        title="Objects"
                        icon={<Box size={14} className="text-amber-400" />}
                        collapsible
                        rightContent={<span className="text-xs font-mono text-muted-foreground">{objects.length}</span>}
                        separator
                    >
                        {objects.map((obj, i) => (
                            <LayerItem
                                key={obj.id}
                                id={obj.id}
                                name={`${obj.modelUrl.charAt(0).toUpperCase() + obj.modelUrl.slice(1)} ${i + 1}`}
                                isSelected={selectedId === obj.id || multiSelectedIds.includes(obj.id)}
                                onSelect={() => setSelected(obj.id)}
                                onShiftSelect={() => toggleMultiSelect(obj.id)}
                                onDelete={() => removeObject(obj.id)}
                            />
                        ))}
                    </SidebarSection>
                </ScrollArea>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-transparent">
            <div className="px-4 pt-4 pb-2 flex items-center gap-1.5">
                <Layers size={12} className="text-muted-foreground" />
                <SidebarHeader>Scene Graph</SidebarHeader>
            </div>
            <ScrollArea className="flex-1">
                {/* Terrain Group */}
                <SidebarSection
                    title="Terrain"
                    icon={<Square size={14} className="text-emerald-500" />}
                    collapsible
                    rightContent={<span className="text-xs font-mono text-muted-foreground">{terrain.length}</span>}
                >
                    {terrain.map((s, i) => (
                        <LayerItem
                            key={s.id}
                            id={s.id}
                            name={`${s.type.charAt(0).toUpperCase() + s.type.slice(1)} ${i + 1}`}
                            isSelected={selectedId === s.id || multiSelectedIds.includes(s.id)}
                            onSelect={() => setSelected(s.id)}
                            onShiftSelect={() => toggleMultiSelect(s.id)}
                            onDelete={() => removeSurface(s.id)}
                        />
                    ))}
                </SidebarSection>

                {/* Water Group */}
                <SidebarSection
                    title="Water"
                    icon={<Square size={14} className="text-cyan-500" />}
                    collapsible
                    rightContent={<span className="text-xs font-mono text-muted-foreground">{water.length}</span>}
                    separator
                >
                    {water.map((s, i) => (
                        <LayerItem
                            key={s.id}
                            id={s.id}
                            name={`Water Body ${i + 1}`}
                            isSelected={selectedId === s.id || multiSelectedIds.includes(s.id)}
                            onSelect={() => setSelected(s.id)}
                            onShiftSelect={() => toggleMultiSelect(s.id)}
                            onDelete={() => removeSurface(s.id)}
                        />
                    ))}
                </SidebarSection>

                {/* Roads Group */}
                <SidebarSection
                    title="Roads & Paths"
                    icon={<Square size={14} className="text-slate-500" />}
                    collapsible
                    rightContent={<span className="text-xs font-mono text-muted-foreground">{roads.length}</span>}
                    separator
                >
                    {roads.map((s, i) => (
                        <LayerItem
                            key={s.id}
                            id={s.id}
                            name={`${s.type.charAt(0).toUpperCase() + s.type.slice(1)} ${i + 1}`}
                            isSelected={selectedId === s.id || multiSelectedIds.includes(s.id)}
                            onSelect={() => setSelected(s.id)}
                            onShiftSelect={() => toggleMultiSelect(s.id)}
                            onDelete={() => removeSurface(s.id)}
                        />
                    ))}
                </SidebarSection>

                {/* Walls (Combined wall surfaces + individual walls) */}
                <SidebarSection
                    title="Walls"
                    icon={<Square size={14} className="text-amber-600" />}
                    collapsible
                    rightContent={<span className="text-xs font-mono text-muted-foreground">{wallSurfaces.length + walls.length}</span>}
                    separator
                >
                    {wallSurfaces.map((s, i) => (
                        <LayerItem
                            key={s.id}
                            id={s.id}
                            name={`Combined Wall ${i + 1}`}
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
                            name={`Wall Segment ${i + 1}`}
                            isSelected={selectedId === wall.id || multiSelectedIds.includes(wall.id)}
                            onSelect={() => setSelected(wall.id)}
                            onShiftSelect={() => toggleMultiSelect(wall.id)}
                            onDelete={() => removeWall(wall.id)}
                        />
                    ))}
                </SidebarSection>



                {/* Structures Group (Floors only - walls are now in their own section) */}
                <SidebarSection
                    title="Floors"
                    icon={<Square size={14} className="text-orange-500" />}
                    collapsible
                    rightContent={<span className="text-xs font-mono text-muted-foreground">{floors.length}</span>}
                    separator
                >
                    {floors.map((floor, i) => (
                        <LayerItem
                            key={floor.id}
                            id={floor.id}
                            name={`Floor ${i + 1}`}
                            isSelected={selectedId === floor.id || multiSelectedIds.includes(floor.id)}
                            onSelect={() => setSelected(floor.id)}
                            onShiftSelect={() => toggleMultiSelect(floor.id)}
                            onDelete={() => removeFloor(floor.id)}
                        />
                    ))}
                </SidebarSection>


                {/* Objects Group */}
                <SidebarSection
                    title="Objects"
                    icon={<Box size={14} className="text-amber-400" />}
                    collapsible
                    rightContent={<span className="text-xs font-mono text-muted-foreground">{objects.length}</span>}
                    separator
                >
                    {objects.map((obj, i) => (
                        <LayerItem
                            key={obj.id}
                            id={obj.id}
                            name={`${obj.modelUrl.charAt(0).toUpperCase() + obj.modelUrl.slice(1)} ${i + 1}`}
                            isSelected={selectedId === obj.id || multiSelectedIds.includes(obj.id)}
                            onSelect={() => setSelected(obj.id)}
                            onShiftSelect={() => toggleMultiSelect(obj.id)}
                            onDelete={() => removeObject(obj.id)}
                        />
                    ))}
                </SidebarSection>
            </ScrollArea>
        </div>
    )
}

