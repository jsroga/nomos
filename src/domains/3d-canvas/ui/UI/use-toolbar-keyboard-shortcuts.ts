'use client'

import React from 'react'
import { useInteriorStore } from '@/domains/3d-canvas'
import { DOM_EVENT_KEYDOWN } from '@/domains/3d-canvas/constants/keyboard'
import {
  INTERACTION_MODE_OBJECT,
  INTERACTION_MODE_SCATTER,
  INTERACTION_MODE_SELECT,
  INTERACTION_MODE_SURFACE,
  INTERACTION_MODE_TERRAIN,
  INTERACTION_MODE_WALL,
  InteriorObjectModel,
  InteriorSurfacePreset,
} from '@/domains/3d-canvas/constants/interaction-modes'
import type { InteractionMode, SurfaceType } from '@/domains/3d-canvas/core/interior-types'

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
}

function handleUndoShortcut(e: KeyboardEvent, undo: () => void): void {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
    undo()
  }
}

function handleRedoShortcut(e: KeyboardEvent, redo: () => void): void {
  if (e.key.toLowerCase() === 'y' && (e.ctrlKey || e.metaKey)) {
    redo()
  }
  if (e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
    redo()
  }
}

function handleModeShortcut(
  key: string,
  shiftKey: boolean,
  actions: {
    setMode: (mode: InteractionMode) => void
    setActiveSurfaceType: (type: SurfaceType) => void
    setIsCurved: (curved: boolean) => void
    setActiveModelUrl: (url: string) => void
  }
): void {
  const { setMode, setActiveSurfaceType, setIsCurved, setActiveModelUrl } = actions

  switch (key) {
    case 'v':
      setMode(INTERACTION_MODE_SELECT)
      break
    case 'w':
      if (shiftKey) {
        setMode(INTERACTION_MODE_OBJECT)
        setActiveModelUrl(InteriorObjectModel.Window)
      } else {
        setMode(INTERACTION_MODE_WALL)
      }
      break
    case 'd':
      setMode(INTERACTION_MODE_OBJECT)
      setActiveModelUrl(InteriorObjectModel.Door)
      break
    case 'g':
      setMode(INTERACTION_MODE_SURFACE)
      setActiveSurfaceType(InteriorSurfacePreset.Grass)
      break
    case 'r':
      setMode(INTERACTION_MODE_SURFACE)
      setActiveSurfaceType(InteriorSurfacePreset.Road)
      setIsCurved(true)
      break
    case 'o':
      setMode(INTERACTION_MODE_OBJECT)
      break
    case 's':
      setMode(INTERACTION_MODE_SCATTER)
      break
    case 't':
      setMode(INTERACTION_MODE_TERRAIN)
      break
  }
}

export function useToolbarKeyboardShortcuts(): void {
  const setMode = useInteriorStore(state => state.setMode)
  const undo = useInteriorStore.temporal.getState().undo
  const redo = useInteriorStore.temporal.getState().redo
  const setActiveSurfaceType = useInteriorStore(state => state.setActiveSurfaceType)
  const setIsCurved = useInteriorStore(state => state.setIsCurved)
  const setActiveModelUrl = useInteriorStore(state => state.setActiveModelUrl)

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return

      handleModeShortcut(e.key.toLowerCase(), e.shiftKey, {
        setMode,
        setActiveSurfaceType,
        setIsCurved,
        setActiveModelUrl,
      })
      handleUndoShortcut(e, undo)
      handleRedoShortcut(e, redo)
    }

    window.addEventListener(DOM_EVENT_KEYDOWN, handleKeyDown)
    return () => window.removeEventListener(DOM_EVENT_KEYDOWN, handleKeyDown)
  }, [setMode, setActiveSurfaceType, setIsCurved, undo, redo, setActiveModelUrl])
}
