'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import { MousePointer2, BrickWall, Square, Box, Undo2, Redo2, Sparkles, Focus, Droplets, GitCommit, Mountain } from 'lucide-react'
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

        case 'r':
          setMode('SURFACE')
          setActiveSurfaceType('road')
          setIsCurved(true)
          break;
        case 'o': setMode('OBJECT'); break;
        case 's': setMode('SCATTER'); break;
        case 't': setMode('TERRAIN'); break;
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
      <div className="flex flex-col items-center gap-3 p-2">
        <div className="flex flex-col items-center gap-2">
          <ToolButton
            icon={<MousePointer2 size={18} className={mode === 'SELECT' ? 'text-indigo-400' : ''} />}
            label="Select (V)"
            isActive={mode === 'SELECT'}
            onClick={() => setMode('SELECT')}
          />

          <ToolButton
            icon={<BrickWall size={18} className={mode === 'WALL' ? 'text-indigo-400' : ''} />}
            label="Draw Walls (W)"
            isActive={mode === 'WALL'}
            onClick={() => setMode('WALL')}
          />

          <ToolButton
            icon={<Square size={18} className={mode === 'SURFACE' && activeSurfaceType === 'grass' ? 'text-indigo-400' : ''} />}
            label="Draw Land (G)"
            isActive={mode === 'SURFACE' && activeSurfaceType === 'grass'}
            onClick={() => {
              setMode('SURFACE')
              setActiveSurfaceType('grass')
            }}
          />

          <ToolButton
            icon={<GitCommit size={18} className={mode === 'SURFACE' && activeSurfaceType === 'road' ? 'text-indigo-400' : ''} />}
            label="Draw Road (R)"
            isActive={mode === 'SURFACE' && activeSurfaceType === 'road'}
            onClick={() => {
              setMode('SURFACE')
              setActiveSurfaceType('road')
              setIsCurved(true)
            }}
          />

          <ToolButton
            icon={<Box size={18} className={mode === 'OBJECT' ? 'text-indigo-400' : ''} />}
            label="Place Objects (O)"
            isActive={mode === 'OBJECT'}
            onClick={() => setMode('OBJECT')}
          />

          <ToolButton
            icon={<Sparkles size={18} className={mode === 'SCATTER' ? 'text-indigo-400' : ''} />}
            label="Scatter Tool (S)"
            isActive={mode === 'SCATTER'}
            onClick={() => setMode('SCATTER')}
          />
        </div>

        <div className="w-8 h-px bg-white/10 my-1" />

        <ToolButton
          icon={<Mountain size={18} className={mode === 'TERRAIN' ? 'text-indigo-400' : ''} />}
          label="Terrain & Water (T)"
          isActive={mode === 'TERRAIN'}
          onClick={() => setMode('TERRAIN')}
        />

        <div className="w-8 h-px bg-white/10 my-1" />

        <div className="flex flex-col items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 hover:bg-white/10 text-zinc-300 transition-all"
                onClick={() => undo()}
              >
                <Undo2 size={24} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Undo (⌘Z)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 hover:bg-white/10 text-zinc-300 transition-all"
                onClick={() => redo()}
              >
                <Redo2 size={24} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Redo (⌘Y)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="w-8 h-px bg-white/10 my-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 hover:bg-white/5"
              onClick={() => setCameraResetRequested(true)}
            >
              <Focus size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Reset Camera</p>
          </TooltipContent>
        </Tooltip>

        <div className="w-8 h-px bg-white/10 my-1" />

        {/* Vertical Level Navigator / Slice Stack */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">
            {mode === 'TERRAIN' ? 'Slice' : 'Level'}
          </span>
          <div className="flex flex-col-reverse gap-2">
            {[0, 1, 2].map(level => {
              const isActive = activeLevel === level;
              return (
                <Tooltip key={level}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setActiveLevel(level)}
                      className={cn(
                        "relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-500 overflow-hidden border group",
                        isActive
                          ? "bg-zinc-100 border-zinc-100 text-zinc-950 shadow-xl shadow-white/5 scale-110 z-10"
                          : "bg-white/5 border-white/5 text-zinc-500 hover:text-zinc-300 hover:border-white/10"
                      )}
                    >
                      {/* Depth effect for inactive ones */}
                      {!isActive && (
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}

                      <span className="relative z-10 text-[10px] font-black">
                        L{level}
                      </span>

                      {/* Active indicator bar */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3 bg-indigo-500 rounded-r-full" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{mode === 'TERRAIN' ? `Terrain Slice ${level}` : `Level ${level}`}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
