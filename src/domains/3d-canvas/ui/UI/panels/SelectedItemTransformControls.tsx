'use client'

import React from 'react'
import { Move, RotateCw, Maximize } from 'lucide-react'
import { Button } from '@/components/Button'
import { SidebarSection } from '@/components/DomainSidebar'
import { useInteriorStore } from '@/domains/3d-canvas'
import type { SceneObject } from '@/domains/3d-canvas/core/interior-types'
import { HeightScaleControl } from './HeightScaleControl'
import { SnapControls } from './SnapControls'

interface SelectedItemTransformControlsProps {
  selectedItem: SceneObject
  updateObject: (id: string, patch: Partial<SceneObject>) => void
}

export function SelectedItemTransformControls({
  selectedItem,
  updateObject,
}: SelectedItemTransformControlsProps) {
  const transformMode = useInteriorStore(state => state.transformMode)
  const setTransformMode = useInteriorStore(state => state.setTransformMode)

  return (
    <SidebarSection title="Transform" separator={false}>
      <SnapControls />

      <div className="flex gap-1 p-1 bg-muted/30 rounded-lg">
        <TransformModeButton
          active={transformMode === 'translate'}
          onClick={() => setTransformMode('translate')}
          title="Move (G)"
          icon={<Move size={12} className="mr-1.5" />}
          label="Move"
        />
        <TransformModeButton
          active={transformMode === 'rotate'}
          onClick={() => setTransformMode('rotate')}
          title="Rotate (R)"
          icon={<RotateCw size={12} className="mr-1.5" />}
          label="Rotate"
        />
        <TransformModeButton
          active={transformMode === 'scale'}
          onClick={() => setTransformMode('scale')}
          title="Scale (S)"
          icon={<Maximize size={12} className="mr-1.5" />}
          label="Scale"
        />
      </div>

      {transformMode === 'scale' && (
        <HeightScaleControl
          objectId={selectedItem.id}
          currentScale={selectedItem.scale}
          onScaleChange={newScale => updateObject(selectedItem.id, { scale: newScale })}
        />
      )}
    </SidebarSection>
  )
}

function TransformModeButton({
  active,
  onClick,
  title,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  title: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <Button
      variant={active ? 'default' : 'ghost'}
      size="sm"
      onClick={onClick}
      title={title}
      className="flex-1 text-[10px] font-mono uppercase tracking-widest h-8"
    >
      {icon}
      {label}
    </Button>
  )
}
