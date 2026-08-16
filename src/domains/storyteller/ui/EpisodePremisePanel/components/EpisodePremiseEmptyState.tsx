import { Sparkles, Target } from 'lucide-react'
import { Button } from '@/components/Button'
import {
  MasterPromptEditor,
  MasterPromptScope,
  MasterPromptSurface,
} from '../../MasterPromptEditor'
import { EpisodePremiseCopy } from '../../StoryPlanBoard/constants/episode-premise-fields'

interface EpisodePremiseEmptyStateProps {
  isGenerating: boolean
  onGenerate: () => void
  episodeTitle?: string
  episodePrompt?: string
  onSaveEpisodePrompt?: (prompt: string) => void
}

export function EpisodePremiseEmptyState({
  isGenerating,
  onGenerate,
  episodeTitle,
  episodePrompt,
  onSaveEpisodePrompt,
}: EpisodePremiseEmptyStateProps) {
  return (
    <div className="flex flex-col h-full min-h-[320px]">
      <header className="w-full border-b border-border pb-4 mb-8 text-left">
        <h2 className="font-mono text-2xl sm:text-3xl font-semibold tracking-tight text-foreground break-words">
          {episodeTitle || EpisodePremiseCopy.UntitledEpisode}
        </h2>
        {onSaveEpisodePrompt ? (
          <div className="mt-4">
            <MasterPromptEditor
              scope={MasterPromptScope.Episode}
              surface={MasterPromptSurface.Page}
              initialPrompt={episodePrompt ?? ''}
              onSave={onSaveEpisodePrompt}
            />
          </div>
        ) : null}
      </header>

      <div className="flex flex-col items-center justify-center p-8 text-center flex-1">
        <div className="w-14 h-14 border-2 border-primary/30 rounded-md flex items-center justify-center mb-6">
          <Target className="w-7 h-7 text-primary" />
        </div>
        <h3 className="font-mono text-xl font-semibold tracking-tight mb-2 text-foreground">
          No Episode Premise
        </h3>
        <p className="text-muted-foreground text-sm max-w-sm mb-8 leading-relaxed">
          Define the core conflict using the Ozymandias Framework: Hook, Flaw, Stakes, and
          Consequence.
        </p>
        <Button
          onClick={onGenerate}
          disabled={isGenerating}
          size="lg"
          className="gap-2 rounded-md font-medium"
        >
          <Sparkles className="w-4 h-4" />
          {isGenerating ? 'Architecting…' : 'Generate Ozymandias Premise'}
        </Button>
      </div>
    </div>
  )
}
