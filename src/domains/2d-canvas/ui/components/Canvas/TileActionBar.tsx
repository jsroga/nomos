'use client'

import { useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { ConfirmDialogVariant } from '@/components/ConfirmDialog/constants/confirm-dialog-copy'
import { generationModeDef } from '@/domains/2d-canvas/constants/generation-modes'
import type { GenerationMode } from '@/domains/2d-canvas/constants/generation-modes'
import type { Tile } from '@/domains/2d-canvas'
import { useWorldStore } from '@/domains/2d-canvas'
import {
  TileActionBarClass,
  TileActionBarCopy,
  TileActionBarVariant,
} from '@/domains/2d-canvas/ui/constants/tile-action-bar'
import {
  resolveTileActionBarVariant,
  tileActionBarPosition,
  tileScreenRect,
} from './tile-action-bar-geometry'
import { TileActionBarBusy } from './TileActionBarBusy'
import { TileActionBarIdle } from './TileActionBarIdle'

interface TileActionBarProps {
  selectedTile: { x: number; y: number } | null
  tiles: Record<string, Tile>
  generatingTiles: Record<string, boolean>
  upscalingTiles: Record<string, boolean>
  enhancingTiles: Record<string, boolean>
  tilePrompt: string
  setTilePrompt: (value: string) => void
  generationMode: GenerationMode
  fidelityCreativity: number
  setFidelityCreativity: (value: number) => void
  isUploading: boolean
  onGenerate: () => void
  onUpscale: () => void
  onUploadClick: () => void
  onDelete: () => void
  onCancelBusy: () => void
  onEnhance: (creativity: number) => void
  viewWidth: number
  viewHeight: number
}

function busyStatus(input: {
  generating: boolean
  upscaling: boolean
}): TileActionBarCopy {
  if (input.generating) return TileActionBarCopy.Generating
  if (input.upscaling) return TileActionBarCopy.Upscaling
  return TileActionBarCopy.Enhancing
}

function stopBarPointer(event: MouseEvent) {
  event.stopPropagation()
}

export function TileActionBar({
  selectedTile,
  tiles,
  generatingTiles,
  upscalingTiles,
  enhancingTiles,
  tilePrompt,
  setTilePrompt,
  generationMode,
  fidelityCreativity,
  setFidelityCreativity,
  isUploading,
  onGenerate,
  onUpscale,
  onUploadClick,
  onDelete,
  onCancelBusy,
  onEnhance,
  viewWidth,
  viewHeight,
}: TileActionBarProps) {
  const viewport = useWorldStore(state => state.viewport)
  const isRepaintMode = useWorldStore(state => state.isRepaintMode)
  const isSelectMode = useWorldStore(state => state.isSelectMode)
  const barRef = useRef<HTMLDivElement>(null)
  const [barWidth, setBarWidth] = useState(320)
  const [enhanceOpen, setEnhanceOpen] = useState(false)
  const { confirm, ConfirmDialogComponent } = useConfirmDialog()

  const tileKey = selectedTile ? `${selectedTile.x},${selectedTile.y}` : null
  const tile = tileKey ? tiles[tileKey] : undefined
  const generating = tileKey ? Boolean(generatingTiles[tileKey]) : false
  const upscaling = tileKey ? Boolean(upscalingTiles[tileKey]) : false
  const enhancing = tileKey ? Boolean(enhancingTiles[tileKey]) : false
  const busy = generating || upscaling || enhancing
  const hasArt = Boolean(tile?.image_filename)
  const variant = resolveTileActionBarVariant({
    hasSelection: Boolean(selectedTile),
    hasArt,
    busy,
    isPanMode: !isRepaintMode && !isSelectMode,
  })

  useLayoutEffect(() => {
    const node = barRef.current
    if (!node) return
    setBarWidth(node.offsetWidth)
  }, [variant, selectedTile, tilePrompt, enhanceOpen, viewWidth, viewHeight, viewport])

  if (!selectedTile || variant === TileActionBarVariant.Hidden) return null

  const rect = tileScreenRect(selectedTile.x, selectedTile.y, viewport, viewWidth, viewHeight)
  const position = tileActionBarPosition(rect, viewWidth, barWidth)
  const allowEnhance = generationModeDef(generationMode).allowsFidelityEnhance

  const handleClear = async () => {
    const approved = await confirm({
      title: TileActionBarCopy.ClearTitle,
      description: TileActionBarCopy.ClearDescription,
      variant: ConfirmDialogVariant.Destructive,
      confirmLabel: TileActionBarCopy.Clear,
    })
    if (!approved) return
    onDelete()
  }

  const handleEnhanceConfirm = () => {
    setEnhanceOpen(false)
    onEnhance(fidelityCreativity)
  }

  return (
    <>
      <div
        ref={barRef}
        className={variant === TileActionBarVariant.Busy ? TileActionBarClass.RootBusy : TileActionBarClass.Root}
        style={{ left: position.left, top: position.top }}
        onMouseDown={stopBarPointer}
        onClick={stopBarPointer}
      >
        {variant === TileActionBarVariant.Busy ? (
          <TileActionBarBusy
            x={selectedTile.x}
            y={selectedTile.y}
            status={busyStatus({ generating, upscaling })}
            onCancel={onCancelBusy}
          />
        ) : (
          <TileActionBarIdle
            variant={variant}
            x={selectedTile.x}
            y={selectedTile.y}
            tilePrompt={tilePrompt}
            onTilePromptChange={setTilePrompt}
            onGenerate={onGenerate}
            onUpscale={onUpscale}
            onUploadClick={onUploadClick}
            onClear={() => {
              void handleClear()
            }}
            allowEnhance={allowEnhance}
            enhanceOpen={enhanceOpen}
            onEnhanceOpenChange={setEnhanceOpen}
            creativity={fidelityCreativity}
            onCreativityChange={setFidelityCreativity}
            onEnhanceConfirm={handleEnhanceConfirm}
            isUploading={isUploading}
          />
        )}
      </div>
      {ConfirmDialogComponent}
    </>
  )
}
