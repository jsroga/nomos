'use client'

import React, { useRef, useState } from 'react'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { Hand, Square, Paintbrush, Upload, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { TOUR_STEP_IDS } from '@/lib/tour-constants'
import { getErrorMessage } from '@/lib/error-utils'

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
          'transition-all duration-200 relative',
          isActive
            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_20px_rgba(79,70,229,0.5)] ring-1 ring-indigo-400/30'
            : 'text-zinc-400 hover:text-indigo-300 hover:bg-indigo-500/10 hover:shadow-[0_0_10px_rgba(79,70,229,0.15)]'
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
  const currentProject = useWorldStore(state => state.currentProject)
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
      toast.error('Please select a project first')
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
        toast.error('No empty tile position found')
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
      formData.append('file', file)
      formData.append('projectId', currentProject.id)
      formData.append('x', target.x.toString())
      formData.append('y', target.y.toString())

      const response = await fetch('/api/tiles/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      // Update local state with the new tile
      useWorldStore.setState(state => ({
        tiles: {
          ...state.tiles,
          [`${target.x},${target.y}`]: data.tile,
        },
      }))

      toast.success(`Tile uploaded at (${target.x}, ${target.y})`)
    } catch (error: unknown) {
      console.error('Upload error:', error)
      toast.error(getErrorMessage(error) || 'Failed to upload tile')
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

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentProject, selectedTile, tiles])

  return (
    <TooltipProvider delayDuration={200}>
      <div id={TOUR_STEP_IDS.WORLDGEN_TOOLBAR} className="flex flex-col items-center gap-1.5 p-2 pt-3">
        <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-indigo-400/60 mb-1 select-none">
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

        <div className="w-8 border-t border-indigo-500/20 my-2" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleUploadClick} disabled={isUploading}>
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
