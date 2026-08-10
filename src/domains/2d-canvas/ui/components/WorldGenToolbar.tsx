'use client'

import React, { useRef, useState } from 'react'
import { useWorldStore } from '@/domains/2d-canvas'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'
import { Hand, Square, Paintbrush, Upload, Loader2 } from 'lucide-react'
import { cn } from '@/shared/data/utils'
import { Button } from '@/components/Button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/Tooltip'
import { toast } from 'sonner'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { readNumber, recordFromJson, readString } from '@/shared/data/json-guards'
import type { Tile } from '@/domains/2d-canvas'
import { DomEventType, FormField } from '@/shared/data/constants/protocol'
import { uploadTileFormData } from '@/domains/2d-canvas/core/io/world-data.api'
import { WORLD_GEN_TOOLBAR_COPY } from '@/domains/2d-canvas/ui/constants/world-gen-toolbar'

interface ToolButtonProps {
  icon: React.ReactNode
  label: string
  isActive?: boolean
  onClick: () => void
}

const ToolButton: React.FC<ToolButtonProps & { id?: string }> = ({ icon, label, isActive, onClick, id }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        id={id}
        variant={isActive ? 'default' : 'ghost'}
        size="icon"
        onClick={onClick}
        className={cn(
          'relative rounded-xl border transition-colors',
          isActive
            ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
            : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground'
        )}
      >
        {icon}
      </Button>
    </TooltipTrigger>
    <TooltipContent side="right">
      <p>{label}</p>
    </TooltipContent>
  </Tooltip>
)

export const WorldGenToolbar: React.FC = () => {
  const isSelectMode = useWorldStore(state => state.isSelectMode)
  const setSelectMode = useWorldStore(state => state.setSelectMode)
  const isRepaintMode = useWorldStore(state => state.isRepaintMode)
  const setRepaintMode = useWorldStore(state => state.setRepaintMode)
  const currentProject = useWorkspaceProjectStore(state => state.currentProject)
  const selectedTile = useWorldStore(state => state.selectedTile)
  const tiles = useWorldStore(state => state.tiles)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const uploadTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Grab mode is when neither select nor repaint is active
  const isGrabMode = !isSelectMode && !isRepaintMode

  const handleGrabMode = () => {
    setSelectMode(false)
    setRepaintMode(false)
  }

  const handleSelectMode = () => {
    setSelectMode(true)
    setRepaintMode(false)
  }

  const handleRepaintMode = () => {
    setSelectMode(false)
    setRepaintMode(true)
  }

  const handleUploadClick = () => {
    if (!currentProject) {
      toast.error(WORLD_GEN_TOOLBAR_COPY.SELECT_PROJECT_FIRST)
      return
    }

    // Find an empty tile position to upload to
    // If a tile is selected and empty, use that. Otherwise find the first empty adjacent position.
    if (selectedTile && !tiles[`${selectedTile.x},${selectedTile.y}`]) {
      uploadTargetRef.current = { x: selectedTile.x, y: selectedTile.y }
      fileInputRef.current?.click()
    } else {
      // Find first empty position (start from 0,0 or next to existing tiles)
      const existingKeys = Object.keys(tiles)
      if (existingKeys.length === 0) {
        // No tiles yet, upload at 0,0
        uploadTargetRef.current = { x: 0, y: 0 }
        useWorldStore.getState().setSelectedTile({ x: 0, y: 0 })
        fileInputRef.current?.click()
      } else {
        // Find an empty adjacent position
        const positions = new Set(existingKeys)
        for (const key of existingKeys) {
          const [x, y] = key.split(',').map(Number)
          const neighbors = [
            { x: x + 1, y },
            { x: x - 1, y },
            { x, y: y + 1 },
            { x, y: y - 1 },
          ]
          for (const n of neighbors) {
            if (!positions.has(`${n.x},${n.y}`)) {
              uploadTargetRef.current = n
              useWorldStore.getState().setSelectedTile(n)
              fileInputRef.current?.click()
              return
            }
          }
        }
        toast.error(WORLD_GEN_TOOLBAR_COPY.NO_EMPTY_TILE_POSITION)
      }
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentProject) return

    // Use the ref to get the target position (more reliable than state)
    const target = uploadTargetRef.current

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append(FormField.File, file)
      formData.append(FormField.ProjectId, currentProject.id)
      formData.append('x', target.x.toString())
      formData.append('y', target.y.toString())

      const data = await uploadTileFormData(formData)

      const tileRecord = recordFromJson(data.tile)
      const uploadedTile: Tile = {
        id: readString(tileRecord.id) ?? `tile-${target.x}-${target.y}`,
        project_id: readString(tileRecord.project_id) ?? currentProject.id,
        x: readNumber(tileRecord.x) ?? target.x,
        y: readNumber(tileRecord.y) ?? target.y,
        tile_prompt: readString(tileRecord.tile_prompt) ?? null,
        image_filename: readString(tileRecord.image_filename) ?? null,
        created_at: readString(tileRecord.created_at) ?? new Date().toISOString(),
      }

      const { tiles } = useWorldStore.getState()
      useWorldStore.setState({
        tiles: {
          ...tiles,
          [`${target.x},${target.y}`]: uploadedTile,
        },
      })

      toast.success(`Tile uploaded at (${target.x}, ${target.y})`)
    } catch (error: unknown) {
      console.error(WORLD_GEN_TOOLBAR_COPY.UPLOAD_ERROR_LOG, error)
      toast.error(getErrorMessage(error) || WORLD_GEN_TOOLBAR_COPY.FAILED_UPLOAD_TILE)
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Keyboard Shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key.toLowerCase()) {
        case 'g':
          handleGrabMode()
          break
        case 's':
          handleSelectMode()
          break
        case 'r':
          handleRepaintMode()
          break
        case 'u':
          handleUploadClick()
          break
      }
    }

    window.addEventListener(DomEventType.KeyDown, handleKeyDown)
    return () => window.removeEventListener(DomEventType.KeyDown, handleKeyDown)
  }, [currentProject, selectedTile, tiles])

  return (
    <TooltipProvider delayDuration={200}>
      <div id={TOUR_STEP_IDS.WORLDGEN_TOOLBAR} className="flex flex-col items-center gap-2 p-2 pt-4">
        <span className="mb-1.5 select-none text-[9px] font-bold font-mono uppercase tracking-[0.25em] text-muted-foreground">
          Tools
        </span>

        <ToolButton
          icon={<Hand size={20} />}
          label="Grab Tool (G)"
          isActive={isGrabMode}
          onClick={handleGrabMode}
        />

        <div id={TOUR_STEP_IDS.WORLDGEN_SELECT_TOOL}>
          <ToolButton
            icon={<Square size={20} />}
            label="Select Mode (S)"
            isActive={isSelectMode}
            onClick={handleSelectMode}
          />
        </div>

        <ToolButton
          icon={<Paintbrush size={20} />}
          label="Repaint Mode (R)"
          isActive={isRepaintMode}
          onClick={handleRepaintMode}
        />

        <div className="my-2.5 w-10 border-t border-border/70" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleUploadClick}
              disabled={isUploading}
              className="rounded-xl border border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground"
            >
              {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Upload Tile (U)</p>
          </TooltipContent>
        </Tooltip>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </TooltipProvider>
  )
}
