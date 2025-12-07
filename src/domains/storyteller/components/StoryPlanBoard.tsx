'use client'

import React, { useState } from 'react'
import { ChevronRight, Check, Edit2, Save, X, Sparkles, AlertCircle, Book } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StoryPlan } from '../schemas/agent-schemas'
import { WorldBiblePanel } from './WorldBiblePanel'

interface StoryPlanBoardProps {
  storyPlan: StoryPlan | null
  onApprove: () => void
  isGenerating?: boolean
  onUpdateSequence?: (id: number, updates: any) => void
}

export const StoryPlanBoard: React.FC<StoryPlanBoardProps> = ({
  storyPlan,
  onApprove,
  isGenerating = false,
}) => {
  if (!storyPlan) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Book className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-2">World Not Yet Generated</h2>
        <p className="text-muted-foreground max-w-md">
          Start a conversation in the Writers Room to build your World Bible.
          We will define the Rules, Factions, and Key Players before starting the plot.
        </p>
      </div>
    )
  }

  // Check if we have sequences (legacy or gardener arcs)
  const hasSequences = storyPlan.sequences && storyPlan.sequences.length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header with Story Info */}
      <div className="p-6 border-b border-border bg-card/50">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">{storyPlan.title || 'Untitled Story'}</h2>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary">
                {storyPlan.genre}
              </span>
              <span>{storyPlan.tone}</span>
            </div>
            {storyPlan.centralQuestion && (
              <p className="mt-3 text-sm italic text-muted-foreground">
                "{storyPlan.centralQuestion}"
              </p>
            )}

            {/* Theme Tags */}
            {storyPlan.themes && storyPlan.themes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {storyPlan.themes.map((theme, i) => (
                  <span key={i} className="text-xs text-muted-foreground bg-muted hover:bg-muted/80 px-2 py-0.5 rounded-full cursor-default">
                    #{theme}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 items-end">
            <Button
              variant="outline"
              className="gap-2 border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
              onClick={() => window.dispatchEvent(new CustomEvent('trigger-agent-action', {
                detail: { type: 'generate_episode_premise' }
              }))}
              disabled={isGenerating}
            >
              <Sparkles className="w-4 h-4" />
              Generate Ozymandias Premise
            </Button>


          </div>
        </div>
      </div>

      {/* Main Content: World Bible OR Legacy Grid */}
      <div className="flex-1 overflow-hidden p-6">
        <WorldBiblePanel storyPlan={storyPlan} />

        {/* If we have sequences generated (The "Spark" and "Reaction"), show them below or in a separate tab later. For now appended to bottom if exists. */}
        {hasSequences && (
          <div className="mt-8 pt-8 border-t border-border">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              Initial Arc Projection
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {storyPlan.sequences!.map((seq: any) => (
                <div key={seq.id} className="p-4 rounded border border-border bg-card/30">
                  <div className="font-bold mb-1">{seq.name}</div>
                  <p className="text-sm text-muted-foreground mb-2">{seq.description || seq.logline}</p>
                  {seq.worldConsequence && (
                    <div className="text-xs text-red-400 bg-red-400/10 p-2 rounded">
                      <strong>Consequence: </strong> {seq.worldConsequence}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}



