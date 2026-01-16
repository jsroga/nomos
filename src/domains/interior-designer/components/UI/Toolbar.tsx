'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import {
  MousePointer2,
  BrickWall,
  Square,
  Box,
  Undo2,
  Redo2,
  Sparkles,
  Focus,
  Droplets,
  GitCommit,
  Mountain,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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
  const setActiveModelUrl = useInteriorStore(state => state.setActiveModelUrl)

  // Keyboard Shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key.toLowerCase()) {
        case 'v':
          setMode('SELECT')
          break
        case 'w':
          if (e.shiftKey) {
            // Shift+W = Window
            setMode('OBJECT')
            setActiveModelUrl('window')
          } else {
            setMode('WALL')
          }
          break
        case 'd':
          // D = Door
          setMode('OBJECT')
          setActiveModelUrl('door')
          break
        case 'g':
          setMode('SURFACE')
          setActiveSurfaceType('grass')
          break

        case 'r':
          setMode('SURFACE')
          setActiveSurfaceType('road')
          setIsCurved(true)
          break
        case 'o':
          setMode('OBJECT')
          break
        case 's':
          setMode('SCATTER')
          break
        case 't':
          setMode('TERRAIN')
          break
        case 'z':
          if ((e.ctrlKey || e.metaKey) && !e.shiftKey) undo()
          break
        case 'y':
          if (e.ctrlKey || e.metaKey) redo()
          break
      }

      // Handle Shift+Z for Redo standard
      if (e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setMode, setActiveSurfaceType, setIsCurved, undo, redo, setActiveModelUrl])

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col items-center gap-4 p-4 h-full overflow-y-auto scrollbar-none bg-transparent">
        <div className="flex flex-col items-center gap-3">
          <ToolButton
            icon={
              <MousePointer2
                size={18}
                className={mode === 'SELECT' ? 'text-indigo-400' : 'text-zinc-500'}
              />
            }
            label="Select (V)"
            isActive={mode === 'SELECT'}
            onClick={() => setMode('SELECT')}
          />

          <ToolButton
            icon={
              <BrickWall
                size={18}
                className={mode === 'WALL' ? 'text-indigo-400' : 'text-zinc-500'}
              />
            }
            label="Draw Walls (W)"
            isActive={mode === 'WALL'}
            onClick={() => setMode('WALL')}
          />

          <ToolButton
            icon={
              <Square
                size={18}
                className={
                  mode === 'SURFACE' && activeSurfaceType === 'grass'
                    ? 'text-indigo-400'
                    : 'text-zinc-500'
                }
              />
            }
            label="Draw Land (G)"
            isActive={mode === 'SURFACE' && activeSurfaceType === 'grass'}
            onClick={() => {
              setMode('SURFACE')
              setActiveSurfaceType('grass')
            }}
          />

          <ToolButton
            icon={
              <GitCommit
                size={18}
                className={
                  mode === 'SURFACE' && activeSurfaceType === 'road'
                    ? 'text-indigo-400'
                    : 'text-zinc-500'
                }
              />
            }
            label="Draw Road (R)"
            isActive={mode === 'SURFACE' && activeSurfaceType === 'road'}
            onClick={() => {
              setMode('SURFACE')
              setActiveSurfaceType('road')
              setIsCurved(true)
            }}
          />

          <ToolButton
            icon={
              <Box size={18} className={mode === 'OBJECT' ? 'text-indigo-400' : 'text-zinc-500'} />
            }
            label="Place Objects (O)"
            isActive={mode === 'OBJECT'}
            onClick={() => setMode('OBJECT')}
          />

          <ToolButton
            icon={
              <Sparkles
                size={18}
                className={mode === 'SCATTER' ? 'text-indigo-400' : 'text-zinc-500'}
              />
            }
            label="Scatter Tool (S)"
            isActive={mode === 'SCATTER'}
            onClick={() => setMode('SCATTER')}
          />
        </div>

        <div className="w-8 h-px bg-border/50 my-2" />

        <ToolButton
          icon={
            <Mountain
              size={18}
              className={mode === 'TERRAIN' ? 'text-indigo-400' : 'text-zinc-500'}
            />
          }
          label="Terrain & Water (T)"
          isActive={mode === 'TERRAIN'}
          onClick={() => setMode('TERRAIN')}
        />

        <div className="w-8 h-px bg-border/50 my-2" />

        <div className="flex flex-col items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 hover:bg-white/5 text-zinc-500 transition-all"
                onClick={() => undo()}
              >
                <Undo2 size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="font-mono text-[10px] uppercase tracking-widest">Undo (⌘Z)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 hover:bg-white/5 text-zinc-500 transition-all"
                onClick={() => redo()}
              >
                <Redo2 size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="font-mono text-[10px] uppercase tracking-widest">Redo (⌘Y)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="w-8 h-px bg-border/50 my-2" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 hover:bg-white/5 text-zinc-500"
              onClick={() => setCameraResetRequested(true)}
            >
              <Focus size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="font-mono text-[10px] uppercase tracking-widest">Reset Camera</p>
          </TooltipContent>
        </Tooltip>

        <div className="w-8 h-px bg-border/50 my-1" />

        {/* Vertical Level Navigator / Slice Stack */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">
            {mode === 'TERRAIN' ? 'Slice' : 'Level'}
          </span>
          <div className="flex flex-col-reverse gap-2">
            {[0, 1, 2].map(level => {
              const isActive = activeLevel === level
              return (
                <Tooltip key={level}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setActiveLevel(level)}
                      className={cn(
                        'relative w-9 h-9 flex items-center justify-center rounded-2xl transition-all duration-500 overflow-hidden border group',
                        isActive
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] scale-110 z-10'
                          : 'bg-muted/10 border-border/40 text-zinc-500 hover:text-zinc-300 hover:border-border'
                      )}
                    >
                      {/* Depth effect for inactive ones */}
                      {!isActive && (
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}

                      <span className="relative z-10 text-[10px] font-black">L{level}</span>

                      {/* Active indicator bar */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3 bg-white rounded-r-full shadow-[0_0_8px_white]" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{mode === 'TERRAIN' ? `Terrain Slice ${level}` : `Level ${level}`}</p>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
