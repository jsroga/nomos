import {
  EpisodePremise,
  StoryPlan,
  StorySequence,
} from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import { recordFromJson, stringArrayFromJson } from '@/shared/data/deep-merge'

import { EpisodePremiseField } from '@/domains/storyteller/ui/StoryPlanBoard/constants/episode-premise-fields'

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every(entry => typeof entry === 'string')
  )
}

/**
 * Bridge a loose episode-plan record into the panel's EpisodePremise shape.
 * Unknown extra keys are preserved via spread so round-tripped saves keep them.
 */
function bridgeEpisodePremise(
  source: Record<string, unknown>,
  fallbackTitle: string | undefined
): EpisodePremise {
  const str = (key: string): string => {
    const value = source[key]
    return typeof value === 'string' ? value : ''
  }
  return {
    ...source,
    title: str(EpisodePremiseField.Title) || fallbackTitle || '',
    logline: str(EpisodePremiseField.Logline),
    theHook: str(EpisodePremiseField.TheHook),
    theTurn: str(EpisodePremiseField.TheTurn),
    theAftermath: str(EpisodePremiseField.TheAftermath),
    protagonistHook: str(EpisodePremiseField.ProtagonistHook) || null,
    fatalFlaw: str(EpisodePremiseField.FatalFlaw),
    stakes: str(EpisodePremiseField.Stakes),
    transformation: str(EpisodePremiseField.Transformation),
    inevitableConsequence: str(EpisodePremiseField.InevitableConsequence),
    thematicFocus: str(EpisodePremiseField.ThematicFocus),
    charactersInvolved: stringArrayFromJson(source.charactersInvolved),
    tenPointsPlan: Array.isArray(source.tenPointsPlan)
      ? source.tenPointsPlan.filter(
          (item): item is string | Record<string, string> =>
            typeof item === 'string' || isStringRecord(item)
        )
      : [],
  }
}
import { EpisodePremisePanel } from '../EpisodePremisePanel'
import { Button } from '@/components/Button'
import { TooltipProvider } from '@/components/Tooltip'
import { CheckCircle } from 'lucide-react'

export interface StoryPlanBoardProps {
  storyPlan: StoryPlan | null
  globalBible: Partial<StoryPlan> | Record<string, unknown>
  onApprove: () => void
  onUpdatePremise?: (updates: Partial<EpisodePremise> & Record<string, unknown>) => void
  onGeneratePremise?: () => void
  onGeneratePoster?: (episodeId?: string) => void
  onGenerateStoryboard?: (episodeId?: string) => void
  onGeneratePremiseSection?: (
    section: 'protagonistHook' | 'fatalFlaw' | 'stakes' | 'inevitableConsequence' | 'logline' | 'tenPointsPlan'
  ) => void
  isGenerating?: boolean
  onUpdateSequence?: (id: number, updates: Partial<StorySequence>) => void
  isGeneratingPoster?: boolean
  isGeneratingStoryboard?: boolean
  isLoading?: boolean
  projectId: string
  episodeId?: string | null
  generatingSection?: string | null
}

const StoryPlanBoard: React.FC<StoryPlanBoardProps> = ({
  storyPlan,
  globalBible,
  onApprove,
  onUpdatePremise,
  onGeneratePremise,
  onGeneratePoster,
  onGenerateStoryboard,
  onGeneratePremiseSection,
  isGenerating = false,
  isGeneratingPoster = false,
  isGeneratingStoryboard = false,
  isLoading = false,
  projectId,
  episodeId,
  generatingSection = null,
}) => {
  // Extract episode premise if it exists within storyPlan (temporary bridging or permanent structure)
  // Assuming storyPlan MIGHT be the episode plan structure.
  // Actually, we need to know if we are looking at an Episode Plan.

  // If loading, show shimmer
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12">
        <div className="space-y-4 w-full max-w-md">
          <div className="w-16 h-16 bg-muted rounded-full mx-auto animate-pulse" />
          <div className="h-8 bg-muted rounded w-3/4 mx-auto animate-pulse" />
          <div className="h-4 bg-muted rounded w-full animate-pulse" />
          <div className="h-4 bg-muted rounded w-2/3 mx-auto animate-pulse" />
        </div>
      </div>
    )
  }

  // If no storyPlan (Episode Plan), we show the "Create Premise" view via EpisodePremisePanel (which handles empty state)

  // Bridge: read the loose episode-plan record into EpisodePremise, or pass null.
  // Ensure title is passed down even if it's on the root object.
  const storyPlanRecord = recordFromJson(storyPlan)
  const premiseRecord = recordFromJson(storyPlanRecord.premise)
  const rawPremise = Object.keys(premiseRecord).length ? premiseRecord : storyPlanRecord
  const episodePremise = storyPlan ? bridgeEpisodePremise(rawPremise, storyPlan.title) : null
  const storyPlanId =
    typeof storyPlanRecord.id === 'string' ? storyPlanRecord.id : undefined
  const stringOrNull = (value: unknown): string | null =>
    typeof value === 'string' ? value : null

  // Check if plan is complete (has all required sections)
  const isPlanComplete =
    episodePremise &&
    episodePremise.protagonistHook &&
    episodePremise.fatalFlaw &&
    episodePremise.stakes &&
    episodePremise.inevitableConsequence

  return (
    <TooltipProvider delayDuration={100}>
    <div className="h-full flex flex-col">
      <EpisodePremisePanel
        premise={episodePremise}
        episodeId={episodeId || storyPlanId}
        globalBible={globalBible}
        posterUrl={stringOrNull(storyPlanRecord.posterUrl)}
        storyboardUrl={stringOrNull(storyPlanRecord.storyboardUrl)}
        posterPrompt={stringOrNull(storyPlanRecord.posterPrompt)}
        projectId={projectId}
        onUpdate={updated => {
          void onUpdatePremise?.(updated)
        }}
        onGenerate={() => onGeneratePremise?.()}
        onGeneratePoster={() => onGeneratePoster?.(storyPlanId)}
        onGenerateStoryboard={() => onGenerateStoryboard?.(storyPlanId)}
        onGenerateSection={section => onGeneratePremiseSection?.(section)}
        isGenerating={isGenerating}
        generatingSection={generatingSection}
        isGeneratingPoster={isGeneratingPoster}
        isGeneratingStoryboard={isGeneratingStoryboard}
      />

      {/* Plan Ready - sharp CTA when premise is complete */}
      {isPlanComplete && (
        <div className="p-4 border-t border-border bg-background/95 backdrop-blur">
          <Button
            onClick={onApprove}
            className="w-full gap-2 rounded-md font-medium"
            size="lg"
          >
            <CheckCircle className="w-4 h-4" />
            Plan Ready — Proceed to Beats
          </Button>
        </div>
      )}
    </div>
    </TooltipProvider>
  )
}
export default StoryPlanBoard
