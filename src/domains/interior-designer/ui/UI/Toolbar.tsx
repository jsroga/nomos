'use client'

import React from 'react'
import { useInteriorStore } from '@/domains/interior-designer'
import {
  MousePointer2,
  BrickWall,
  Square,
  Box,
  Undo2,
  Redo2,
  Sparkles,
  Focus,
  GitCommit,
  Mountain,
} from 'lucide-react'
import { Button } from '@/components/Button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/Tooltip'
import { useToolbarKeyboardShortcuts } from './use-toolbar-keyboard-shortcuts'

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
  const undo = useInteriorStore.temporal.getState().undo
  const redo = useInteriorStore.temporal.getState().redo
  const setCameraResetRequested = useInteriorStore(state => state.setCameraResetRequested)
  const activeSurfaceType = useInteriorStore(state => state.activeSurfaceType)
  const setActiveSurfaceType = useInteriorStore(state => state.setActiveSurfaceType)
  const setIsCurved = useInteriorStore(state => state.setIsCurved)

  useToolbarKeyboardShortcuts()

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col items-center gap-2 p-2 h-full overflow-y-auto scrollbar-none bg-transparent">
        <div className="flex flex-col items-center gap-1">
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
      </div>
    </TooltipProvider>
  )
}
