'use client'

import React from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import { MousePointer2, BrickWall, Square, Box, Undo2, Redo2, Sparkles, Focus, Droplets, GitCommit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ToolButtonProps {
  icon: React.ReactNode
  label: string
  isActive?: boolean
  onClick: () => void
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon, label, isActive, onClick }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant={isActive ? 'default' : 'ghost'} size="icon" onClick={onClick}>
        {icon}
      </Button>
    </TooltipTrigger>
    <TooltipContent side="right">
      <p>{label}</p>
    </TooltipContent>
  </Tooltip>
)

export const Toolbar: React.FC = () => {
  const mode = useInteriorStore(state => state.mode)
  const setMode = useInteriorStore(state => state.setMode)
  const activeLevel = useInteriorStore(state => state.activeLevel)
  const setActiveLevel = useInteriorStore(state => state.setActiveLevel)
  const undo = useInteriorStore.temporal.getState().undo
  const redo = useInteriorStore.temporal.getState().redo
  const setCameraResetRequested = useInteriorStore(state => state.setCameraResetRequested)

  // Removed duplicates

  const activeSurfaceType = useInteriorStore(state => state.activeSurfaceType)
  const setActiveSurfaceType = useInteriorStore(state => state.setActiveSurfaceType)
  const setIsCurved = useInteriorStore(state => state.setIsCurved)

  // Keyboard Shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key.toLowerCase()) {
        case 'v': setMode('SELECT'); break;
        case 'w':
          if (e.shiftKey) { // W is also used for movement in some apps, but let's stick to simple mapping first
            // If we implement WASD movement, we might need a modifier or different key. 
            // For now, let's assume W is for Walls as per UI.
            setMode('WALL')
          } else {
            setMode('WALL')
          }
          break;
        case 'g':
          setMode('SURFACE')
          setActiveSurfaceType('grass')
          break;
        case 'l': // Keeping L for legacy habits or Water
          setMode('SURFACE')
          setActiveSurfaceType('water')
          break;
        case 'r':
          setMode('SURFACE')
          setActiveSurfaceType('road')
          setIsCurved(true)
          break;
        case 'o': setMode('OBJECT'); break;
        case 's': setMode('SCATTER'); break;
        case 'z': if ((e.ctrlKey || e.metaKey) && !e.shiftKey) undo(); break;
        case 'y': if ((e.ctrlKey || e.metaKey)) redo(); break;
      }

      // Handle Shift+Z for Redo standard
      if (e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setMode, setActiveSurfaceType, setIsCurved, undo, redo])

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col items-center gap-2 p-2">
        <ToolButton
          icon={<MousePointer2 size={20} />}
          label="Select (V)"
          isActive={mode === 'SELECT'}
          onClick={() => setMode('SELECT')}
        />

        <ToolButton
          icon={<BrickWall size={20} />}
          label="Draw Walls (W)"
          isActive={mode === 'WALL'}
          onClick={() => setMode('WALL')}
        />

        <ToolButton
          icon={<Square size={20} />}
          label="Draw Land (G)"
          isActive={mode === 'SURFACE' && activeSurfaceType === 'grass'}
          onClick={() => {
            setMode('SURFACE')
            setActiveSurfaceType('grass')
          }}
        />

        <ToolButton
          icon={<Droplets size={20} />}
          label="Draw Water (L)"
          isActive={mode === 'SURFACE' && activeSurfaceType === 'water'}
          onClick={() => {
            setMode('SURFACE')
            setActiveSurfaceType('water')
          }}
        />

        <ToolButton
          icon={<GitCommit size={20} />}
          label="Draw Road (R)"
          isActive={mode === 'SURFACE' && activeSurfaceType === 'road'}
          onClick={() => {
            setMode('SURFACE')
            setActiveSurfaceType('road')
            setIsCurved(true)
          }}
        />

        <ToolButton
          icon={<Box size={20} />}
          label="Place Objects (O)"
          isActive={mode === 'OBJECT'}
          onClick={() => setMode('OBJECT')}
        />

        <ToolButton
          icon={<Sparkles size={20} />}
          label="Scatter Tool (S)"
          isActive={mode === 'SCATTER'}
          onClick={() => setMode('SCATTER')}
        />

        <div className="w-full h-px bg-border my-2" />

        <div className="flex flex-col items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => useInteriorStore.temporal.getState().undo()}
              >
                <Undo2 size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Undo (Ctrl+Z)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => useInteriorStore.temporal.getState().redo()}
              >
                <Redo2 size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Redo (Ctrl+Y)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="w-full h-px bg-border my-2" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCameraResetRequested(true)}
            >
              <Focus size={20} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Reset Camera</p>
          </TooltipContent>
        </Tooltip>

        <div className="w-full h-px bg-border my-2" />

        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-medium">Level</span>
          <div className="flex flex-col gap-1">
            {[0, 1, 2].map(level => (
              <Tooltip key={level}>
                <TooltipTrigger asChild>
                  <Button
                    variant={activeLevel === level ? 'default' : 'outline'}
                    size="sm"
                    className="h-6 w-8 text-xs"
                    onClick={() => setActiveLevel(level)}
                  >
                    {level}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Floor {level}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

