import { Edit2, RefreshCw, Save, Sparkles } from 'lucide-react'
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

type PremiseSectionKey = EpisodePremiseSectionKey

interface EpisodePremiseToolbarProps {
  isEditing: boolean
  isGenerating: boolean
  generatingSection: string | null
  hasLogline: boolean
  onGenerateSection?: (section: PremiseSectionKey) => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSave: () => void
}

export function EpisodePremiseToolbar({
  isEditing,
  isGenerating,
  generatingSection,
  hasLogline,
  onGenerateSection,
  onStartEdit,
  onCancelEdit,
  onSave,
}: EpisodePremiseToolbarProps) {
  return (
    <div className="w-full flex justify-end mb-6">
      <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {!isEditing && onGenerateSection && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onGenerateSection(EpisodePremiseSectionKey.Logline)}
            disabled={isGenerating}
            className="gap-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground h-7 px-2"
            title="Regenerate Description (Logline)"
          >
            <RefreshCw
              className={cn('w-3.5 h-3.5', generatingSection === EpisodePremiseSectionKey.Logline && 'animate-spin')}
            />
            {generatingSection === EpisodePremiseSectionKey.Logline
              ? 'Generating…'
              : hasLogline
                ? 'Regenerate Description'
                : 'Generate Description'}
          </Button>
        )}
        {isEditing ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelEdit}
              className="rounded-md text-xs text-muted-foreground hover:text-foreground h-7 px-2"
            >
              Cancel
            </Button>
            <Button size="sm" onClick={onSave} className="gap-1.5 rounded-md text-xs h-7 px-2">
              <Save className="w-3.5 h-3.5" /> Save
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onStartEdit}
            className="gap-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground h-7 px-2"
            disabled={isGenerating}
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </Button>
        )}
      </div>
    </div>
  )
}

interface EpisodePremiseHeroProps {
  localPremise: LocalPremise
  isEditing: boolean
  isGeneratingPoster: boolean
  generatingSection: string | null
  fullPosterUrl: string | null
  posterPrompt?: string | null
  projectId: string
  onGeneratePoster?: () => void
  onTitleChange: (value: string) => void
  onThematicFocusChange: (value: string) => void
  episodePrompt?: string
  onSaveEpisodePrompt?: (prompt: string) => void
}

export function EpisodePremiseHero({
  localPremise,
  isEditing,
  isGeneratingPoster,
  generatingSection,
  fullPosterUrl,
  posterPrompt,
  projectId,
  onGeneratePoster,
  onTitleChange,
  onThematicFocusChange,
  episodePrompt,
  onSaveEpisodePrompt,
}: EpisodePremiseHeroProps) {
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
              className="px-2 py-1 bg-muted border border-border text-foreground rounded-md text-xs font-mono uppercase tracking-wider focus:border-primary outline-none w-full mb-2"
              value={localPremise.thematicFocus || ''}
              onChange={e => onThematicFocusChange(e.target.value)}
              placeholder="THEME"
            />
          ) : (
            localPremise.thematicFocus && (
              <span className="px-2 py-1 bg-muted border border-border text-foreground rounded-md text-xs font-mono uppercase tracking-wider shrink-0 mb-2">
                <RichText text={localPremise.thematicFocus} projectId={projectId} inline />
              </span>
            )
          )}
          {generatingSection === EpisodePremiseSectionKey.Logline ? (
            <Skeleton className="h-10 w-full rounded-md bg-muted mb-4" />
          ) : !localPremise.logline ? (
            <p className="text-sm text-muted-foreground mb-4">
              No description yet. Use Regenerate Description to generate a logline.
            </p>
          ) : null}
          {localPremise.logline && (
            <blockquote className="text-sm border-l-2 border-primary/50 pl-4 text-foreground/90 break-words italic">
              <RichText text={localPremise.logline} projectId={projectId} markdown />
            </blockquote>
          )}
        </div>
      </div>
    </>
  )
}
