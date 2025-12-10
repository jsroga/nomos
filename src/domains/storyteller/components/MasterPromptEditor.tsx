import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Save, Scroll, FileText } from 'lucide-react'

interface MasterPromptEditorProps {
  scope: 'Project' | 'Episode'
  initialPrompt: string
  onSave: (prompt: string) => void
}

export const MasterPromptEditor: React.FC<MasterPromptEditorProps> = ({
  scope,
  initialPrompt,
  onSave,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    setPrompt(initialPrompt || '')
    setIsDirty(false)
  }, [initialPrompt])

  const handleSave = () => {
    onSave(prompt)
    setIsDirty(false)
  }

  const ScopeIcon = scope === 'Project' ? Scroll : FileText

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <ScopeIcon size={12} />
          {scope} Prompt
        </label>
        {isDirty && (
          <Button
            size="sm"
            variant="default"
            className="h-6 text-xs gap-1"
            onClick={handleSave}
          >
            <Save size={12} />
            Save
          </Button>
        )}
      </div>
      <textarea
        value={prompt}
        onChange={e => {
          setPrompt(e.target.value)
          setIsDirty(true)
        }}
        className="w-full bg-background/50 border-2 border-border/60 rounded-md p-3 text-sm min-h-[100px] resize-none hover:border-border transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30 focus:outline-none placeholder:text-muted-foreground/60"
        placeholder={`Define the style and instructions for this ${scope.toLowerCase()}...`}
      />
    </div>
  )
}
