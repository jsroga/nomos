'use client'

import React from 'react'
import { Hand, Square, Paintbrush } from 'lucide-react'
import { useWorldStore } from '@/domains/2d-canvas'
import { cn } from '@/shared/data/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/Tooltip'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import {
  WorldCanvasToolShortcut,
} from '@/domains/2d-canvas/ui/components/Canvas/constants/world-canvas'
import {
  WorldGenToolLabel,
  WorldGenToolbarClass,
} from '@/domains/2d-canvas/ui/constants/world-gen-toolbar'

interface ToolButtonProps {
  icon: React.ReactNode
  label: string
  shortcut: string
  isActive?: boolean
  onClick: () => void
  id?: string
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon, label, shortcut, isActive, onClick, id }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type={HtmlElementType.Button}
        id={id}
        onClick={onClick}
        aria-pressed={isActive}
        aria-label={label}
        className={cn(isActive ? WorldGenToolbarClass.ToolActive : WorldGenToolbarClass.Tool)}
      >
        {icon}
      </button>
    </TooltipTrigger>
    <TooltipContent side="right" className="flex items-center">
      <span>{label}</span>
      <span className={WorldGenToolbarClass.Shortcut}>{shortcut}</span>
    </TooltipContent>
  </Tooltip>
)

export const WorldGenToolbar: React.FC = () => {
  const isSelectMode = useWorldStore(state => state.isSelectMode)
  const setSelectMode = useWorldStore(state => state.setSelectMode)
  const isRepaintMode = useWorldStore(state => state.isRepaintMode)
  const setRepaintMode = useWorldStore(state => state.setRepaintMode)
  const clearSelectBox = useWorldStore(state => state.clearSelectBox)
  const setSelectedMask = useWorldStore(state => state.setSelectedMask)

  const isPanMode = !isSelectMode && !isRepaintMode

  const handlePanMode = () => {
    setSelectMode(false)
    clearSelectBox()
    setSelectedMask(null)
    setRepaintMode(false)
  }

  const handleSelectMode = () => {
    setRepaintMode(false)
    setSelectMode(true)
  }

  const handlePaintMode = () => {
    setSelectMode(false)
    clearSelectBox()
    setSelectedMask(null)
    setRepaintMode(true)
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div
        id={TOUR_STEP_IDS.WORLDGEN_TOOLBAR}
        role="toolbar"
        aria-label={WorldGenToolLabel.Toolbar}
        className={WorldGenToolbarClass.Root}
      >
        <ToolButton
          icon={<Hand size={18} strokeWidth={1.8} />}
          label={WorldGenToolLabel.Pan}
          shortcut={WorldCanvasToolShortcut.Pan.toUpperCase()}
          isActive={isPanMode}
          onClick={handlePanMode}
        />
        <div id={TOUR_STEP_IDS.WORLDGEN_SELECT_TOOL}>
          <ToolButton
            icon={<Square size={18} strokeWidth={1.8} />}
            label={WorldGenToolLabel.Select}
            shortcut={WorldCanvasToolShortcut.Select.toUpperCase()}
            isActive={isSelectMode}
            onClick={handleSelectMode}
          />
        </div>
        <ToolButton
          icon={<Paintbrush size={18} strokeWidth={1.8} />}
          label={WorldGenToolLabel.Paint}
          shortcut={WorldCanvasToolShortcut.Paint.toUpperCase()}
          isActive={isRepaintMode}
          onClick={handlePaintMode}
        />
      </div>
    </TooltipProvider>
  )
}
