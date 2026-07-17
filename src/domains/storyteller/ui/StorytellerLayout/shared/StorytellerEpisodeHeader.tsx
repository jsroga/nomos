'use client'

import { cn } from '@/shared/data/utils'
import { PhaseNavigatorCompact } from '../../PhaseNavigator'
import { StorytellerTab } from '@/domains/storyteller/core/storyteller-page-wire'
import type { PhaseId } from '@/domains/storyteller/core/types/enums'
import { Network } from 'lucide-react'

interface StorytellerEpisodeHeaderProps {
  currentEpisodeTitle?: string | null
  currentEpisodeId: string
  currentPhase: PhaseId
  isSending: boolean
  handlePreviousPhase: () => void
  handlePhaseChange: (phase: PhaseId) => void
  activeTab: string
  setActiveTab: (tab: string) => void
}

export const StorytellerEpisodeHeader: React.FC<StorytellerEpisodeHeaderProps> = ({
  currentEpisodeTitle,
  currentEpisodeId,
  currentPhase,
  isSending,
  handlePreviousPhase,
  handlePhaseChange,
  activeTab,
  setActiveTab,
}) => (
  <div className="shrink-0 border-b border-border flex items-center px-4 bg-card justify-between z-40 relative py-2 gap-4 flex-wrap min-h-[60px]">
    <div className="flex items-center gap-3 shrink-0">
      <h1 className="text-sm font-bold whitespace-nowrap">
        {currentEpisodeTitle || `Ep. ${currentEpisodeId?.slice(0, 6) || ''}...`}
      </h1>

      <PhaseNavigatorCompact
        currentPhase={currentPhase}
        isWorking={isSending}
        onGoBack={handlePreviousPhase}
        onPhaseChange={handlePhaseChange}
      />

      <button
        onClick={() =>
          setActiveTab(
            activeTab === StorytellerTab.Relationships
              ? StorytellerTab.Plan
              : StorytellerTab.Relationships
          )
        }
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 border',
          activeTab === StorytellerTab.Relationships
            ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
            : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 border-transparent'
        )}
        title="View character & faction relationships"
      >
        <Network size={12} />
        <span>Relationships</span>
      </button>
    </div>
  </div>
)
