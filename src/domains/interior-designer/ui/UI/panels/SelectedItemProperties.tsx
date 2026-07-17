'use client'

import React from 'react'
import { Button } from '@/components/Button'
import { SidebarInput, SidebarSliderRow } from '@/components/DomainSidebar'
import { useInteriorStore } from '@/domains/interior-designer'
import {
  isObject,
  isWall,
  type SelectedInteriorItem,
} from '@/domains/interior-designer/ui/UI/utils/properties-panel-type-guards'
import {
  DEFAULT_FRAME_COLOR,
  OBJECT_COLOR_PRESETS,
} from '@/domains/interior-designer/constants/mesh-colors'
import { RetextureControls } from './RetextureControls'
import { TextTo3DControls } from './TextTo3DControls'
import { SelectedItemTransformControls } from './SelectedItemTransformControls'

interface SelectedItemPropertiesProps {
  selectedItem: SelectedInteriorItem
  mode: import('@/domains/interior-designer/core/interior-types').InteractionMode
  projectId: string
  onDelete: () => void
}

export function SelectedItemProperties({
  selectedItem,
  projectId,
  onDelete,
}: SelectedItemPropertiesProps) {
  const updateWall = useInteriorStore(state => state.updateWall)
  const updateFloor = useInteriorStore(state => state.updateFloor)
  const updateObject = useInteriorStore(state => state.updateObject)
  const itemId = selectedItem.id

  return (
    <div className="space-y-6">
      <div className="text-[10px] font-mono font-bold bg-muted/30 p-3 rounded-lg text-muted-foreground border border-border flex items-center justify-between">
        <span className="uppercase tracking-widest text-[9px]">Reference ID</span>
        <span className="font-mono text-foreground bg-background/50 px-2 py-0.5 rounded">
          {itemId.slice(0, 8)}
        </span>
      </div>

      <SelectedItemTextureField
        selectedItem={selectedItem}
        itemId={itemId}
        updateWall={updateWall}
        updateFloor={updateFloor}
        updateObject={updateObject}
      />

      {isWall(selectedItem) && (
        <SidebarSliderRow
          label="Height"
          value={selectedItem.height}
          min={0.5}
          max={10}
          step={0.1}
          onChange={val => updateWall(itemId, { height: val })}
          formatValue={val => `${val.toFixed(1)}m`}
        />
      )}

      {isObject(selectedItem) && (
        <SelectedItemTransformControls
          selectedItem={selectedItem}
          updateObject={updateObject}
        />
      )}

      {isObject(selectedItem) &&
        (selectedItem.modelUrl === 'window' || selectedItem.modelUrl === 'door') && (
          <ObjectColorPicker objectId={selectedItem.id} color={selectedItem.color} />
        )}

      {(isObject(selectedItem) || isWall(selectedItem)) && (
        <RetextureControls
          objectId={selectedItem.id}
          modelUrl={isObject(selectedItem) ? selectedItem.modelUrl : selectedItem.texture || ''}
          projectId={projectId}
        />
      )}

      {isObject(selectedItem) && (
        <TextTo3DControls
          objectId={selectedItem.id}
          projectId={projectId}
          onModelGenerated={modelUrl =>
            updateObject(selectedItem.id, { modelUrl, isLoading: false })
          }
        />
      )}

      <Button
        onClick={onDelete}
        variant="ghost"
        className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 py-6 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all mt-4 border border-transparent hover:border-red-500/20"
      >
        Delete Object
      </Button>
    </div>
  )
}

function SelectedItemTextureField({
  selectedItem,
  itemId,
  updateWall,
  updateFloor,
  updateObject,
}: {
  selectedItem: SelectedInteriorItem
  itemId: string
  updateWall: (id: string, patch: { texture?: string }) => void
  updateFloor: (id: string, patch: { texture?: string }) => void
  updateObject: (id: string, patch: { modelUrl?: string }) => void
}) {
  return (
    <div className="space-y-2">
      <SidebarInput
        type="text"
        value={isObject(selectedItem) ? selectedItem.modelUrl : selectedItem.texture || ''}
        placeholder="#ffffff or url"
        onChange={e => {
          const val = e.target.value
          if (isWall(selectedItem)) updateWall(itemId, { texture: val })
          else if (isObject(selectedItem)) updateObject(itemId, { modelUrl: val })
          else updateFloor(itemId, { texture: val })
        }}
      />
    </div>
  )
}

function ObjectColorPicker({ objectId, color }: { objectId: string; color?: string }) {
  const updateObject = useInteriorStore(state => state.updateObject)
  const displayColor = color || DEFAULT_FRAME_COLOR

  return (
    <div className="pt-6 border-t border-white/5 space-y-3">
      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
        Object Color
      </h3>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={displayColor}
          onChange={e => updateObject(objectId, { color: e.target.value })}
          className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent"
        />
        <span className="text-xs font-mono text-zinc-400">{displayColor}</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {OBJECT_COLOR_PRESETS.map(preset => (
          <button
            key={preset}
            onClick={() => updateObject(objectId, { color: preset })}
            className="w-8 h-8 rounded-lg border border-white/10 hover:scale-110 transition-transform"
            style={{ backgroundColor: preset }}
            title={preset}
          />
        ))}
      </div>
    </div>
  )
}
