'use client'

import React, { useState } from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import { Button } from '@/components/ui/button'
import { DomainSidebar } from '@/components/ui/domain-sidebar'
import {
    ChevronDown,
    ChevronRight,
    Layers,
    Square,
    Box,
    Trash2,
    Eye,
    EyeOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface LayerSectionProps {
    title: string
    icon: React.ReactNode
    count: number
    children: React.ReactNode
    defaultOpen?: boolean
}

const LayerSection: React.FC<LayerSectionProps> = ({
    title,
    icon,
    count,
    children,
    defaultOpen = true,
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <div className="border-b border-border last:border-b-0">
            <button
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {icon}
                <span className="text-sm font-medium flex-1 text-left">{title}</span>
                <span className="text-xs text-muted-foreground">{count}</span>
            </button>
            {isOpen && <div className="pb-2">{children}</div>}
        </div>
    )
}

interface LayerItemProps {
    id: string
    name: string
    isSelected: boolean
    onSelect: () => void
    onDelete: () => void
}

const LayerItem: React.FC<LayerItemProps> = ({
    id,
    name,
    isSelected,
    onSelect,
    onDelete,
}) => {
    return (
        <div
            className={cn(
                'flex items-center gap-2 px-3 py-1.5 mx-2 rounded cursor-pointer group',
                isSelected ? 'bg-primary/20 text-primary' : 'hover:bg-muted/50'
            )}
            onClick={onSelect}
        >
            <span className="text-xs flex-1 truncate">{name}</span>
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

export const LayerPanel: React.FC = () => {
    const surfaces = useInteriorStore(state => state.surfaces)
    const walls = useInteriorStore(state => state.walls)
    const floors = useInteriorStore(state => state.floors)
    const objects = useInteriorStore(state => state.objects)
    const selectedId = useInteriorStore(state => state.selectedId)
    const setSelected = useInteriorStore(state => state.setSelected)
    const removeSurface = useInteriorStore(state => state.removeSurface)
    const removeWall = useInteriorStore(state => state.removeWall)
    const removeFloor = useInteriorStore(state => state.removeFloor)
    const removeObject = useInteriorStore(state => state.removeObject)

    // Group surfaces by type
    const terrain = surfaces.filter(s => ['grass', 'mars', 'sand', 'dirt', 'rock'].includes(s.type) && !s.isPath)
    const roads = surfaces.filter(s => ['road', 'pavement'].includes(s.type) || s.isPath)
    const water = surfaces.filter(s => s.type === 'water')

    return (
        <DomainSidebar title="Scene Graph" defaultWidth={224} minWidth={180} maxWidth={400} resizeHandle="right">
                {/* Terrain Group */}
                <LayerSection
                    title="Terrain"
                    icon={<Square size={14} className="text-emerald-500" />}
                    count={terrain.length}
                >
                    {terrain.map((s, i) => (
                        <LayerItem
                            key={s.id}
                            id={s.id}
                            name={`${s.type.charAt(0).toUpperCase() + s.type.slice(1)} ${i + 1}`}
                            isSelected={selectedId === s.id}
                            onSelect={() => setSelected(s.id)}
                            onDelete={() => removeSurface(s.id)}
                        />
                    ))}
                </LayerSection>

                {/* Water Group */}
                <LayerSection
                    title="Water"
                    icon={<Square size={14} className="text-cyan-500" />}
                    count={water.length}
                >
                    {water.map((s, i) => (
                        <LayerItem
                            key={s.id}
                            id={s.id}
                            name={`Water Body ${i + 1}`}
                            isSelected={selectedId === s.id}
                            onSelect={() => setSelected(s.id)}
                            onDelete={() => removeSurface(s.id)}
                        />
                    ))}
                </LayerSection>

                {/* Roads Group */}
                <LayerSection
                    title="Roads & Paths"
                    icon={<Square size={14} className="text-slate-500" />}
                    count={roads.length}
                >
                    {roads.map((s, i) => (
                        <LayerItem
                            key={s.id}
                            id={s.id}
                            name={`${s.type.charAt(0).toUpperCase() + s.type.slice(1)} ${i + 1}`}
                            isSelected={selectedId === s.id}
                            onSelect={() => setSelected(s.id)}
                            onDelete={() => removeSurface(s.id)}
                        />
                    ))}
                </LayerSection>

                {/* Structures Group (Floors/Walls) */}
                <LayerSection
                    title="Structures"
                    icon={<Square size={14} className="text-orange-500" />}
                    count={walls.length + floors.length}
                >
                    {floors.map((floor, i) => (
                        <LayerItem
                            key={floor.id}
                            id={floor.id}
                            name={`Floor ${i + 1}`}
                            isSelected={selectedId === floor.id}
                            onSelect={() => setSelected(floor.id)}
                            onDelete={() => removeFloor(floor.id)}
                        />
                    ))}
                    {walls.map((wall, i) => (
                        <LayerItem
                            key={wall.id}
                            id={wall.id}
                            name={`Wall ${i + 1}`}
                            isSelected={selectedId === wall.id}
                            onSelect={() => setSelected(wall.id)}
                            onDelete={() => removeWall(wall.id)}
                        />
                    ))}
                </LayerSection>

                {/* Objects Group */}
                <LayerSection
                    title="Objects"
                    icon={<Box size={14} className="text-amber-400" />}
                    count={objects.length}
                >
                    {objects.map((obj, i) => (
                        <LayerItem
                            key={obj.id}
                            id={obj.id}
                            name={`${obj.modelUrl.charAt(0).toUpperCase() + obj.modelUrl.slice(1)} ${i + 1}`}
                            isSelected={selectedId === obj.id}
                            onSelect={() => setSelected(obj.id)}
                            onDelete={() => removeObject(obj.id)}
                        />
                    ))}
                </LayerSection>
        </DomainSidebar>
    )
}
