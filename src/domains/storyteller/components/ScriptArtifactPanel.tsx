import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, RefreshCw, Copy } from 'lucide-react'

interface ScriptArtifactPanelProps {
  content: string
  onRegenerate: (selection: string) => void
}

export const ScriptArtifactPanel: React.FC<ScriptArtifactPanelProps> = ({
  content,
  onRegenerate,
}) => {
  const [selection, setSelection] = useState('')

  const handleSelect = () => {
    const text = window.getSelection()?.toString()
    if (text) setSelection(text)
  }

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <FileText size={16} className="text-primary" />
          <span>Script Artifact</span>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" title="Copy to Clipboard">
            <Copy size={14} />
          </Button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto p-8 font-serif text-lg leading-relaxed max-w-3xl mx-auto w-full"
        onMouseUp={handleSelect}
      >
        {content ? (
          <div className="whitespace-pre-wrap">{content}</div>
        ) : (
          <div className="text-muted-foreground italic text-center mt-20">
            No script generated yet. Start the writers room to break the story.
          </div>
        )}
      </div>

      {selection && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-popover border border-border shadow-lg rounded-full px-4 py-2 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <span className="text-xs font-medium text-muted-foreground">
            Selected: {selection.length} chars
          </span>
          <div className="h-4 w-px bg-border" />
          <button
            className="p-1.5 rounded-md transition-colors text-white hover:bg-white/10"
            onClick={() => onRegenerate(selection)}
            title="Regenerate"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
