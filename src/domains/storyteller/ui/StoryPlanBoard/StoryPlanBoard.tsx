import { StoryPlan, StorySequence } from '@/domains/storyteller/prompts/schemas/agent-schemas'
import { EpisodePremisePanel } from '../EpisodePremisePanel'
import { Button } from '@/components/Button'
import { TooltipProvider } from '@/components/Tooltip'
import { CheckCircle } from 'lucide-react'

export interface StoryPlanBoardProps {
  storyPlan: StoryPlan | null
  globalBible: Partial<StoryPlan>
  onApprove: () => void
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

  // Bridge: Cast storyPlan to EpisodePremise if it fits, or pass null
  // Ensure title is passed down even if it's on the root object
  const rawPremise = (storyPlan as any)?.premise || storyPlan
  const episodePremise = rawPremise
    ? {
        ...rawPremise,
        title: (rawPremise as any).title || storyPlan?.title,
      }
    : null

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
        episodeId={episodeId || (storyPlan as any)?.id}
        globalBible={globalBible}
        posterUrl={(storyPlan as any)?.posterUrl}
        storyboardUrl={(storyPlan as any)?.storyboardUrl}
        posterPrompt={(storyPlan as any)?.posterPrompt}
        projectId={projectId}
        onUpdate={updated => {
          // Handle updates - likely need a prop for this or dispatch event
          console.log('Update premise:', updated)
          window.dispatchEvent(
            new CustomEvent('update_episode_premise', {
              detail: updated,
            })
          )
        }}
        onGenerate={() =>
          window.dispatchEvent(
            new CustomEvent('trigger-agent-action', {
              detail: { type: 'generate_episode_premise' },
            })
          )
        }
        onGeneratePoster={() =>
          window.dispatchEvent(
            new CustomEvent('generate-episode-poster', {
              detail: { episodeId: (storyPlan as any)?.id },
            })
          )
        }
        onGenerateStoryboard={() =>
          window.dispatchEvent(
            new CustomEvent('trigger-storyboard-generation', {
              detail: { episodeId: (storyPlan as any)?.id },
            })
          )
        }
        onGenerateSection={section =>
          window.dispatchEvent(
            new CustomEvent('trigger-agent-action', {
              detail: { type: 'generate_episode_premise_section', section },
            })
          )
        }
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
