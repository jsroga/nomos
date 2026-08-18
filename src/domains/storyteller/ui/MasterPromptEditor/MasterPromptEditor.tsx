import React, { useState, useEffect } from 'react'
import { Save, Scroll, FileText } from 'lucide-react'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { getRandomWorldPromptIdea } from '@/shared/data/constants/worldPromptIdeas'
import { cn } from '@/shared/data/utils'
import {
  MasterPromptField,
  MasterPromptFieldClass,
  MasterPromptFieldCopy,
  MasterPromptSuggestMode,
  MasterPromptSuggestion,
} from '@/components/MasterPromptField'
import {
  MasterPromptEditorLabel,
  MasterPromptEditorPlaceholder,
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
    setSuggestedIdea(getRandomWorldPromptIdea())
  }

  const handleAcceptIdea = () => {
    if (!suggestedIdea) return
    setPrompt(suggestedIdea)
    onSave(suggestedIdea)
    setSuggestedIdea(null)
    setIsDirty(false)
  }

  const isPage = surface === MasterPromptSurface.Page
  const isProject = scope === MasterPromptScope.Project
  const ScopeIcon = isProject ? Scroll : FileText

  return (
    <MasterPromptField
      className={cn(isPage && 'w-full')}
      label={isProject ? MasterPromptEditorLabel.Project : MasterPromptEditorLabel.Episode}
      icon={<ScopeIcon size={isPage ? 14 : 12} strokeWidth={1.7} />}
      value={prompt}
      onChange={next => {
        setPrompt(next)
        setIsDirty(true)
      }}
      placeholder={
        isProject ? MasterPromptEditorPlaceholder.Project : MasterPromptEditorPlaceholder.Episode
      }
      suggestMode={isProject ? MasterPromptSuggestMode.Iterate : undefined}
      onSuggest={isProject ? handleSuggestIdea : undefined}
      suggestButtonId={TOUR_STEP_IDS.SUGGEST_IDEA_BUTTON}
      rightAction={
        isDirty && !suggestedIdea ? (
          <button
            type={HtmlElementType.Button}
            className={MasterPromptFieldClass.PrimaryAction}
            onClick={handleSave}
          >
            <Save size={12} strokeWidth={1.7} />
            {MasterPromptFieldCopy.Save}
          </button>
        ) : null
      }
      suggestion={
        suggestedIdea ? (
          <MasterPromptSuggestion
            idea={suggestedIdea}
            onAccept={handleAcceptIdea}
            onReject={() => setSuggestedIdea(null)}
            onNext={handleSuggestIdea}
          />
        ) : undefined
      }
    />
  )
}
