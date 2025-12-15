import { StoryPlan } from '../schemas/agent-schemas'
import { EpisodePremisePanel } from './EpisodePremisePanel'

interface StoryPlanBoardProps {
  storyPlan: StoryPlan | null
  globalBible: any
  onApprove: () => void
  isGenerating?: boolean
  onUpdateSequence?: (id: number, updates: any) => void
}

export const StoryPlanBoard: React.FC<StoryPlanBoardProps> = ({
  storyPlan,
  globalBible,
  onApprove,
  isGenerating = false,
}) => {
  // Extract episode premise if it exists within storyPlan (temporary bridging or permanent structure)
  // Assuming storyPlan MIGHT be the episode plan structure.
  // Actually, we need to know if we are looking at an Episode Plan.

  // If no storyPlan (Episode Plan), we show the "Create Premise" view via EpisodePremisePanel (which handles empty state)

  // Bridge: Cast storyPlan to EpisodePremise if it fits, or pass null
  const episodePremise = (storyPlan as any)?.premise || storyPlan; // Handle both nested and flat structures

  return (
    <div className="h-full flex flex-col">
      <EpisodePremisePanel
        premise={episodePremise}
        globalBible={globalBible}
        posterUrl={(storyPlan as any)?.posterUrl}
        posterPrompt={(storyPlan as any)?.posterPrompt}
        projectId={(storyPlan as any)?.projectId || 'unknown'}
        onUpdate={(updated) => {
          // Handle updates - likely need a prop for this or dispatch event
          console.log("Update premise:", updated)
        }}
        onGenerate={() => window.dispatchEvent(new CustomEvent('trigger-agent-action', {
          detail: { type: 'generate_episode_premise' }
        }))}
        onGeneratePoster={() => window.dispatchEvent(new CustomEvent('generate-episode-poster', {
          detail: { episodeId: (storyPlan as any)?.id } // Assuming storyPlan has ID if it's an episode
        }))}
        isGenerating={isGenerating}
        isGeneratingPoster={(storyPlan as any)?.isGeneratingPoster}
      />
    </div>
  )
}



