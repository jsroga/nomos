import React, { useState, useEffect } from 'react'
import { Button } from '@/components/Button'
import { Textarea } from '@/components/Textarea'
import { Save, Scroll, FileText, Sparkles } from 'lucide-react'
import { SidebarTextarea } from '@/components/DomainSidebar'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { getRandomWorldPromptIdea } from '@/shared/data/constants/worldPromptIdeas'
import { cn } from '@/shared/data/utils'
import {
  MasterPromptScope,
  MasterPromptSurface,
} from '@/domains/storyteller/ui/MasterPromptEditor/constants/master-prompt-editor'

interface MasterPromptEditorProps {
  scope: `${MasterPromptScope}`
  initialPrompt: string
  onSave: (prompt: string) => void
  surface?: `${MasterPromptSurface}`
}

export const MasterPromptEditor: React.FC<MasterPromptEditorProps> = ({
  scope,
  initialPrompt,
  onSave,
  surface = MasterPromptSurface.Sidebar,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt)
  const [isDirty, setIsDirty] = useState(false)
  const [suggestedIdea, setSuggestedIdea] = useState<string | null>(null)

  useEffect(() => {
    setPrompt(initialPrompt || '')
    setIsDirty(false)
  }, [initialPrompt])

  const handleSave = () => {
    onSave(prompt)
    setIsDirty(false)
  }

  const handleSuggestIdea = () => {
    const idea = getRandomWorldPromptIdea()
    setSuggestedIdea(idea)
  }

  const handleAcceptIdea = () => {
    if (suggestedIdea) {
      setPrompt(suggestedIdea)
      onSave(suggestedIdea)
      setSuggestedIdea(null)
      setIsDirty(false)
    }
  }

  const handleRejectIdea = () => {
    setSuggestedIdea(null)
  }

  const isPage = surface === MasterPromptSurface.Page
  const ScopeIcon = scope === MasterPromptScope.Project ? Scroll : FileText

  return (
    <div className={cn('space-y-2', isPage && 'w-full')}>
      <div className="flex items-center justify-between gap-3">
        <label
          className={cn(
            'uppercase flex items-center text-muted-foreground',
            isPage
              ? 'font-mono text-[11px] font-medium tracking-widest gap-2'
              : 'text-xs font-bold tracking-wider gap-1.5'
          )}
        >
          <ScopeIcon size={isPage ? 14 : 12} />
          {scope} Prompt
        </label>
        <div className="flex items-center gap-1">
          {scope === MasterPromptScope.Project && !suggestedIdea && (
            <Button
              id={TOUR_STEP_IDS.SUGGEST_IDEA_BUTTON}
              size="sm"
              variant="outline"
              className="h-6 text-xs gap-1 border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={handleSuggestIdea}
              title="Get a random creative world prompt idea"
            >
              <Sparkles size={12} />
              Suggest idea
            </Button>
          )}
          {isDirty && !suggestedIdea && (
            <Button size="sm" variant="default" className="h-6 text-xs gap-1" onClick={handleSave}>
              <Save size={12} />
              Save
            </Button>
          )}
        </div>
      </div>

      {suggestedIdea ? (
        <div className="bg-primary/5 border border-primary/20 rounded-md p-3 space-y-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
            <Sparkles size={12} />
            Suggested Idea
          </div>
          <p className="text-sm italic text-foreground/90 leading-relaxed border-l-2 border-primary/30 pl-3">
            "{suggestedIdea}"
          </p>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="h-7 text-xs gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleAcceptIdea}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleRejectIdea}
            >
              Reject
            </Button>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 opacity-70 hover:opacity-100"
              onClick={handleSuggestIdea}
              title="Try another idea"
            >
              Next
              <Sparkles size={10} />
            </Button>
          </div>
        </div>
      ) : isPage ? (
        <Textarea
          value={prompt}
          onChange={e => {
            setPrompt(e.target.value)
            setIsDirty(true)
          }}
          className="min-h-[72px] resize-none bg-muted/5 border-border/40 text-sm leading-relaxed placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:ring-offset-0"
          placeholder={`Define the style and instructions for this ${scope.toLowerCase()}...`}
        />
      ) : (
        <SidebarTextarea
          value={prompt}
          onChange={e => {
            setPrompt(e.target.value)
            setIsDirty(true)
          }}
          className="min-h-[100px]"
          placeholder={`Define the style and instructions for this ${scope.toLowerCase()}...`}
        />
      )}
    </div>
  )
}
