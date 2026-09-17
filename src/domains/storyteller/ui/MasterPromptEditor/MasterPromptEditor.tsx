import React, { useState } from 'react'
import { Scroll, FileText } from 'lucide-react'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { getRandomWorldPromptIdea } from '@/shared/data/utils/worldPromptIdeas'
import { cn } from '@/shared/data/utils'
import {
  MasterPromptField,
  MasterPromptSuggestMode,
  MasterPromptSuggestion,
  useMasterPromptAutosave,
} from '@/components/MasterPromptField'
import {
  MasterPromptEditorLabel,
  MasterPromptEditorPlaceholder,
  MasterPromptScope,
  MasterPromptSurface,
} from '@/domains/storyteller/ui/MasterPromptEditor/constants/master-prompt-editor'

interface MasterPromptEditorProps {
  scope: `${MasterPromptScope}`
  hydrateKey: string
  initialPrompt: string
  onSave: (prompt: string) => void
  surface?: `${MasterPromptSurface}`
}

export const MasterPromptEditor: React.FC<MasterPromptEditorProps> = ({
  scope,
  hydrateKey,
  initialPrompt,
  onSave,
  surface = MasterPromptSurface.Sidebar,
}) => {
  const [suggestedIdea, setSuggestedIdea] = useState<string | null>(null)
  const { prompt, handleChange, persistNow } = useMasterPromptAutosave(
    initialPrompt,
    hydrateKey,
    onSave,
  )

  const handleSuggestIdea = () => {
    setSuggestedIdea(getRandomWorldPromptIdea())
  }

  const handleAcceptIdea = () => {
    if (!suggestedIdea) return
    persistNow(suggestedIdea)
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
