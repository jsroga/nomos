import React from 'react'
import { Sparkles, X, ArrowRight } from 'lucide-react'

interface WorldCanvasPromptPopoverProps {
  show: boolean
  position: { x: number; y: number }
  selectTextPrompt: string
  promptInputRef: React.RefObject<HTMLInputElement | null>
  onPromptChange: (value: string) => void
  onConfirm: () => void
  onCancel: () => void
}

export const WorldCanvasPromptPopover: React.FC<WorldCanvasPromptPopoverProps> = ({
  show,
  position,
  selectTextPrompt,
  promptInputRef,
  onPromptChange,
  onConfirm,
  onCancel,
}) => {
  if (!show) return null

  return (
    <div
      className="fixed z-50 animate-in fade-in-0 zoom-in-95 duration-150"
      style={{
        left: Math.min(position.x + 8, window.innerWidth - 320),
        top: Math.min(position.y + 8, window.innerHeight - 120),
      }}
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl p-3 w-72">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">What do you want to select?</span>
          <button onClick={onCancel} className="ml-auto p-1 hover:bg-muted rounded">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex gap-2">
          <input
            ref={promptInputRef}
            type="text"
            value={selectTextPrompt}
            onChange={e => onPromptChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onConfirm()
              } else if (e.key === 'Escape') {
                onCancel()
              }
            }}
            onMouseDown={e => e.stopPropagation()}
            placeholder="e.g., car, person, tree..."
            className="flex-1 bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
          />
          <button
            onClick={e => {
              e.stopPropagation()
              onConfirm()
            }}
            onMouseDown={e => e.stopPropagation()}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-1"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[10px] text-muted-foreground mt-2">
          Press Enter to segment • Esc to cancel • Leave empty for auto-detect
        </p>
      </div>
    </div>
  )
}
