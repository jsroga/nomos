'use client'

import React from 'react'
import { TOUR_STEP_IDS } from '@/lib/tour-constants'
import { Sparkles, Loader2 } from 'lucide-react'
import { Film, BookOpen, FilePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StorytellerEmptyStateProps {
  hasBible: boolean
  hasEpisodes: boolean
  firstEpisodeId: string | null
  isSending: boolean
  onGenerateBible: () => void
  onDraftFirstEpisode: () => void
  onSelectFirstEpisode: (id: string) => void
  onOpenBible: () => void
}

export const StorytellerEmptyState = React.memo(function StorytellerEmptyState({
  hasBible,
  hasEpisodes,
  firstEpisodeId,
  isSending,
  onGenerateBible,
  onDraftFirstEpisode,
  onSelectFirstEpisode,
  onOpenBible,
}: StorytellerEmptyStateProps) {
  return (
    <div className="flex-1 overflow-hidden flex items-center justify-center p-12 z-10 relative">
      <div className="max-w-2xl w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="space-y-3">
          <div className="flex justify-center">
            <div className="p-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30 shadow-xl">
              <Film className="w-12 h-12 text-primary" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-foreground">
            {hasBible
              ? hasEpisodes
                ? 'Select First Episode'
                : 'Ready to Create Your First Episode?'
              : "Let's Build Your Storybible First"}
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {hasBible
              ? hasEpisodes
                ? 'Select an episode from the sidebar to continue writing, or create a new one.'
                : 'Use the AI to draft your first episode, or manually create one in the sidebar.'
              : "Before we dive into episodes, let's establish the foundation of your world—the rules, themes, and characters that make it unique."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          {!hasBible ? (
            <>
              <Button
                size="lg"
                variant="outline"
                onClick={onGenerateBible}
                disabled={isSending}
                className="gap-2 text-base px-8 font-bold text-yellow-500 transition-all duration-300 rounded-lg overflow-hidden border border-yellow-500/50 hover:border-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20 backdrop-blur-sm hover:shadow-[0_0_20px_-5px_rgba(234,179,8,0.5)] hover:scale-[1.02]"
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <BookOpen className="w-5 h-5" />
                )}
                Generate Storybible First
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={onOpenBible}
                disabled={isSending}
                className="gap-2 text-base px-8"
              >
                <FilePlus className="w-5 h-5" />
                Create Manually
              </Button>
            </>
          ) : (
            <>
              {hasEpisodes && firstEpisodeId ? (
                <Button
                  size="lg"
                  variant="default"
                  onClick={() => onSelectFirstEpisode(firstEpisodeId)}
                  className="gap-2 text-base px-8 font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Select First Episode
                </Button>
              ) : (
                <Button
                  id={TOUR_STEP_IDS.STORYTELLER_AI_DRAFT}
                  size="lg"
                  variant="outline"
                  onClick={onDraftFirstEpisode}
                  disabled={isSending}
                  className="gap-2 text-base px-8 font-bold text-primary transition-all duration-300 rounded-lg overflow-hidden border border-primary/50 hover:border-primary bg-primary/10 hover:bg-primary/20 backdrop-blur-sm hover:shadow-[0_0_20px_-5px_rgba(92,124,250,0.5)] hover:scale-[1.02]"
                >
                  {isSending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                  AI Draft First Episode
                </Button>
              )}

              <Button
                size="lg"
                variant="outline"
                onClick={onOpenBible}
                className="gap-2 text-base px-8 shadow-sm"
              >
                <BookOpen className="w-5 h-5" />
                Open Storybible
              </Button>
            </>
          )}
        </div>

        <div className="pt-8 text-xs text-muted-foreground/60 max-w-md mx-auto">
          <div className="flex items-start gap-2 text-left">
            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500/50" />
            <p>
              <strong className="text-foreground/80">Tip:</strong>{' '}
              {hasBible
                ? 'Your Storybible is ready. Use it as a reference while drafting episodes to maintain consistency.'
                : 'Starting with the Storybible helps the AI understand your vision and maintain consistency across episodes.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
})
