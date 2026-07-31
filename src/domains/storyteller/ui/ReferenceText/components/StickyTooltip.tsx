import React, { useEffect, useRef, useState } from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/shared/data/utils'
import { TOOLTIP_SURFACE_CLASS } from '@/components/Tooltip/Tooltip'
import {
  DOM_EVENT_KEYDOWN,
  REFERENCE_TEXT_DOM_EVENT_KEYUP,
  ReferenceTextKeyboardKey,
} from '../constants/reference-text-display'

let isAltKeyDown = false
if (typeof window !== 'undefined') {
  window.addEventListener(DOM_EVENT_KEYDOWN, e => {
    if (e.key === ReferenceTextKeyboardKey.Alt) isAltKeyDown = true
  })
  window.addEventListener(REFERENCE_TEXT_DOM_EVENT_KEYUP, e => {
    if (e.key === ReferenceTextKeyboardKey.Alt) isAltKeyDown = false
  })
}

function useAltKeyHeld(): boolean {
  const [isAltHeld, setIsAltHeld] = useState(isAltKeyDown)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ReferenceTextKeyboardKey.Alt) setIsAltHeld(true)
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ReferenceTextKeyboardKey.Alt) setIsAltHeld(false)
    }
    window.addEventListener(DOM_EVENT_KEYDOWN, handleKeyDown)
    window.addEventListener(REFERENCE_TEXT_DOM_EVENT_KEYUP, handleKeyUp)
    return () => {
      window.removeEventListener(DOM_EVENT_KEYDOWN, handleKeyDown)
      window.removeEventListener(REFERENCE_TEXT_DOM_EVENT_KEYUP, handleKeyUp)
    }
  }, [])

  return isAltHeld
}

function useCloseOnAltRelease(
  isAltHeld: boolean,
  isHoveringContent: boolean,
  isOpen: boolean,
  setOpen: (open: boolean) => void
): void {
  useEffect(() => {
    if (!isAltHeld && !isHoveringContent && isOpen) {
      setOpen(false)
    }
  }, [isAltHeld, isHoveringContent, isOpen, setOpen])
}

interface StickyTooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export const StickyTooltip: React.FC<StickyTooltipProps> = ({
  children,
  content,
  open: controlledOpen,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isHoveringContent, setIsHoveringContent] = useState(false)
  const isAltHeld = useAltKeyHeld()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isHoveringContentRef = useRef(isHoveringContent)
  const isAltHeldRef = useRef(isAltHeld)

  const isOpen = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  useEffect(() => {
    isHoveringContentRef.current = isHoveringContent
    isAltHeldRef.current = isAltHeld
  }, [isHoveringContent, isAltHeld])

  useCloseOnAltRelease(isAltHeld, isHoveringContent, isOpen, setOpen)

  const handleTriggerEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setOpen(true)
  }

  const handleTriggerLeave = () => {
    if (isAltHeldRef.current) return

    timeoutRef.current = setTimeout(() => {
      if (!isHoveringContentRef.current && !isAltHeldRef.current) {
        setOpen(false)
      }
    }, 300)
  }

  const handleContentEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsHoveringContent(true)
  }

  const handleContentLeave = () => {
    setIsHoveringContent(false)
    if (!isAltHeld) {
      setOpen(false)
    }
  }

  return (
    <TooltipPrimitive.Root open={isOpen}>
      <TooltipPrimitive.Trigger asChild>
        <span
          onMouseEnter={handleTriggerEnter}
          onMouseLeave={handleTriggerLeave}
          className="cursor-pointer"
        >
          {children}
        </span>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="top"
          sideOffset={5}
          onMouseEnter={handleContentEnter}
          onMouseLeave={handleContentLeave}
          className={cn(
            'z-[200] overflow-hidden rounded-lg',
            TOOLTIP_SURFACE_CLASS,
            'px-3 py-2 text-sm',
            'animate-in fade-in-0 zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
            'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
            'pointer-events-auto'
          )}
        >
          {content}
          {isAltHeld && (
            <div className="mt-2 pt-2 border-t border-zinc-600/80 text-[10px] text-zinc-300 flex items-center gap-1">
              <span className="bg-zinc-800/80 px-1 rounded text-white">Option/Alt</span>
              <span>held - tooltip frozen</span>
            </div>
          )}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
