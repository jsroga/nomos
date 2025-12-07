import React, { useState, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'

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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
          {scope} Master Prompt
        </label>
        {isDirty && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs text-blue-400"
            onClick={handleSave}
          >
            <Save size={12} className="mr-1" /> Save
          </Button>
        )}
      </div>
      <Textarea
        value={prompt}
        onChange={e => {
          setPrompt(e.target.value)
          setIsDirty(true)
        }}
        className="bg-neutral-900 border-neutral-700 text-xs min-h-[100px] font-mono"
        placeholder={`Define the style and instructions for this ${scope.toLowerCase()}...`}
      />
    </div>
  )
}
