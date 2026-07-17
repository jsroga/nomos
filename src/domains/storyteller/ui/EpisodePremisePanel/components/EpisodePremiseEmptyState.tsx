import React from 'react'
import { Sparkles, Target } from 'lucide-react'
import { Button } from '@/components/Button'

interface EpisodePremiseEmptyStateProps {
  isGenerating: boolean
  onGenerate: () => void
}

export function EpisodePremiseEmptyState({ isGenerating, onGenerate }: EpisodePremiseEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[320px]">
      <div className="w-14 h-14 border-2 border-primary/30 rounded-md flex items-center justify-center mb-6">
        <Target className="w-7 h-7 text-primary" />
      </div>
      <h2 className="font-mono text-xl font-semibold tracking-tight mb-2 text-foreground">
        No Episode Premise
      </h2>
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
  )
}
