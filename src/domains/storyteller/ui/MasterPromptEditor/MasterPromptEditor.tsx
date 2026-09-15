import React, { useState, useEffect, useRef } from 'react'
import { Scroll, FileText } from 'lucide-react'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { getRandomWorldPromptIdea } from '@/shared/data/utils/worldPromptIdeas'
import { cn } from '@/shared/data/utils'
import {
  MASTER_PROMPT_SAVE_DEBOUNCE_MS,
  MasterPromptField,
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
  const [suggestedIdea, setSuggestedIdea] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setPrompt(initialPrompt || '')
  }, [initialPrompt])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const persistPrompt = (value: string) => {
    onSave(value)
  }

  const handleChange = (next: string) => {
    setPrompt(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      persistPrompt(next)
    }, MASTER_PROMPT_SAVE_DEBOUNCE_MS)
  }

  const handleSuggestIdea = () => {
    setSuggestedIdea(getRandomWorldPromptIdea())
  }

  const handleAcceptIdea = () => {
    if (!suggestedIdea) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setPrompt(suggestedIdea)
    persistPrompt(suggestedIdea)
    setSuggestedIdea(null)
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
      onChange={handleChange}
      placeholder={
        isProject ? MasterPromptEditorPlaceholder.Project : MasterPromptEditorPlaceholder.Episode
      }
      suggestMode={isProject ? MasterPromptSuggestMode.Iterate : undefined}
      onSuggest={isProject ? handleSuggestIdea : undefined}
      suggestButtonId={TOUR_STEP_IDS.SUGGEST_IDEA_BUTTON}
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
