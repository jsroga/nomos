import { RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { StorytellerImage } from '../../StorytellerImage'
import { EpisodePremiseSectionKey } from '../constants/ozymandias-sections'
import { cn } from '@/shared/data/utils'
import { LocalPremise } from '../hooks/useEpisodePremiseLocalState'
import { RichText } from '../../RichText'
import {
  MasterPromptEditor,
  MasterPromptScope,
  MasterPromptSurface,
} from '../../MasterPromptEditor'
import { EpisodePremiseCopy } from '../../StoryPlanBoard/constants/episode-premise-fields'
import { useStorytellerChatBusy } from '@/domains/storyteller/state/hooks/useStorytellerChatBusy'

type PremiseSectionKey = EpisodePremiseSectionKey

interface EpisodePremiseDescriptionProps {
  isEditing: boolean
  isGenerating: boolean
  generatingSection: string | null
  logline: string | undefined
  projectId: string
  onGenerateSection?: (section: PremiseSectionKey) => void
  onLoglineChange: (value: string) => void
}

function EpisodePremiseDescription({
  isEditing,
  isGenerating,
  generatingSection,
  logline,
  projectId,
  onGenerateSection,
  onLoglineChange,
}: EpisodePremiseDescriptionProps) {
  const isGeneratingLogline = generatingSection === EpisodePremiseSectionKey.Logline
  const showRefresh = !isEditing && Boolean(onGenerateSection)

  return (
    <div className="relative">
      {showRefresh && onGenerateSection ? (
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-0 right-0 z-10 h-7 w-7 rounded-md text-muted-foreground hover:text-primary"
          onClick={() => onGenerateSection(EpisodePremiseSectionKey.Logline)}
          disabled={isGenerating}
          title={EpisodePremiseCopy.RegenerateDescription}
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isGeneratingLogline && 'animate-spin')} />
        </Button>
      ) : null}
      <div className={cn(showRefresh && 'pr-8')}>
        {isGeneratingLogline ? (
          <Skeleton className="h-10 w-full rounded-md bg-muted" />
        ) : isEditing ? (
          <textarea
            className="w-full min-h-[88px] p-3 bg-muted/30 border border-border text-foreground rounded-md text-sm italic focus:border-primary outline-none resize-y"
            value={logline || ''}
            onChange={e => onLoglineChange(e.target.value)}
            placeholder={EpisodePremiseCopy.DescriptionPlaceholder}
          />
        ) : logline ? (
          <blockquote className="text-sm border-l-2 border-primary/50 pl-4 text-foreground/90 break-words italic">
            <RichText text={logline} projectId={projectId} markdown />
          </blockquote>
        ) : (
          <p className="text-sm text-muted-foreground">{EpisodePremiseCopy.NoDescription}</p>
        )}
      </div>
    </div>
  )
}

interface EpisodePremiseHeroProps {
  localPremise: LocalPremise
  isEditing: boolean
  isGenerating: boolean
  isGeneratingPoster: boolean
  generatingSection: string | null
  fullPosterUrl: string | null
  posterPrompt?: string | null
  projectId: string
  onGeneratePoster?: () => void
  onGenerateSection?: (section: PremiseSectionKey) => void
  onTitleChange: (value: string) => void
  onThematicFocusChange: (value: string) => void
  onLoglineChange: (value: string) => void
  episodePrompt?: string
  onSaveEpisodePrompt?: (prompt: string) => void
}

export function EpisodePremiseHero({
  localPremise,
  isEditing,
  isGenerating,
  isGeneratingPoster,
  generatingSection,
  fullPosterUrl,
  posterPrompt,
  projectId,
  onGeneratePoster,
  onGenerateSection,
  onTitleChange,
  onThematicFocusChange,
  onLoglineChange,
  episodePrompt,
  onSaveEpisodePrompt,
}: EpisodePremiseHeroProps) {
  const isChatBusy = useStorytellerChatBusy()
  return (
    <>
      <header className="w-full border-b border-border pb-4 mb-6">
        <div className="flex flex-wrap items-center gap-2 w-full">
          {isEditing ? (
            <input
              className="font-mono text-2xl sm:text-3xl font-semibold tracking-tight bg-transparent border-b border-border focus:border-primary outline-none flex-1 min-w-[12rem] text-foreground"
              value={localPremise.title || ''}
              onChange={e => onTitleChange(e.target.value)}
              placeholder={EpisodePremiseCopy.UntitledEpisode}
            />
          ) : (
            <h2 className="font-mono text-2xl sm:text-3xl font-semibold tracking-tight text-foreground break-words">
              <RichText
                text={localPremise.title || EpisodePremiseCopy.UntitledEpisode}
                projectId={projectId}
                inline
                markdown
              />
            </h2>
          )}
        </div>
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

      <div className="w-full flex flex-col sm:flex-row gap-6 sm:gap-8 mb-8">
        <div className="w-40 sm:w-44 flex-shrink-0">
          <StorytellerImage
            src={fullPosterUrl}
            alt="Episode Poster"
            isLoading={isGeneratingPoster}
            aspectRatio="aspect-[2/3]"
            emptyLabel="No Poster"
            onGenerate={onGeneratePoster}
            overlay={
              <div className="flex flex-col gap-2 w-full px-2">
                {onGeneratePoster && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full gap-2 text-xs rounded-md"
                    disabled={isChatBusy}
                    onClick={onGeneratePoster}
                  >
                    <Sparkles className="w-3 h-3" /> Regenerate
                  </Button>
                )}
                {posterPrompt && (
                  <div className="text-[10px] text-white/80 text-center line-clamp-3 px-1">
                    {posterPrompt}
                  </div>
                )}
              </div>
            }
          />
        </div>
        <div className="flex-1 min-w-[14rem] flex flex-col gap-3">
          {isEditing ? (
            <input
              className="px-2 py-1 bg-muted border border-border text-foreground rounded-md text-xs font-mono uppercase tracking-wider focus:border-primary outline-none w-full"
              value={localPremise.thematicFocus || ''}
              onChange={e => onThematicFocusChange(e.target.value)}
              placeholder={EpisodePremiseCopy.ThemePlaceholder}
            />
          ) : (
            localPremise.thematicFocus && (
              <span className="px-2 py-1 bg-muted border border-border text-foreground rounded-md text-xs font-mono uppercase tracking-wider shrink-0">
                <RichText text={localPremise.thematicFocus} projectId={projectId} inline />
              </span>
            )
          )}
          <EpisodePremiseDescription
            isEditing={isEditing}
            isGenerating={isGenerating}
            generatingSection={generatingSection}
            logline={localPremise.logline}
            projectId={projectId}
            onGenerateSection={onGenerateSection}
            onLoglineChange={onLoglineChange}
          />
        </div>
      </div>
    </>
  )
}
