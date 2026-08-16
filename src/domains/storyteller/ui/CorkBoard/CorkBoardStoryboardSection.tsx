import React from 'react'
import { Button } from '@/components/Button'
import { Image as ImageIcon, Loader2, Sparkles } from 'lucide-react'
import { CorkBoardUrlScheme } from './constants/cork-board'

interface CorkBoardStoryboardSectionProps {
  storyboardUrl?: string | null
  isGeneratingCombined?: boolean
  onGenerateCombined?: () => void
  beatCount: number
  onExpandStoryboard: () => void
  getUrl: (url: string | null) => string
}

export const CorkBoardStoryboardSection: React.FC<CorkBoardStoryboardSectionProps> = ({
  storyboardUrl,
  isGeneratingCombined,
  onGenerateCombined,
  beatCount,
  onExpandStoryboard,
  getUrl,
}) => (
  <div className="grid grid-cols-1 gap-4 mb-6">
    <div className="bg-card border border-border rounded-md p-4 flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-mono text-[11px] font-medium uppercase tracking-widest text-foreground flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5 text-primary" />
            Combined Storyboard
          </h3>
          <p className="text-[10px] text-muted-foreground mt-1">Episode visual summary</p>
        </div>
        {onGenerateCombined && (
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerateCombined}
            disabled={isGeneratingCombined || beatCount === 0}
            className="gap-2 rounded-md"
          >
            {isGeneratingCombined ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            {isGeneratingCombined ? 'Planning...' : storyboardUrl ? 'Regenerate' : 'Generate'}
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-[200px] flex items-center justify-center bg-muted/30 rounded-md border border-border relative overflow-hidden group">
        {isGeneratingCombined ? (
          <div className="text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
            <p className="text-xs text-muted-foreground">Synthesizing Scenes...</p>
          </div>
        ) : storyboardUrl ? (
          <div onClick={onExpandStoryboard} className="cursor-zoom-in w-full h-full">
            <img
              src={getUrl(storyboardUrl)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              alt="Combined Storyboard"
            />
          </div>
        ) : (
          <div className="text-center text-muted-foreground text-xs p-4">
            No storyboard generated.
          </div>
        )}
      </div>
    </div>
  </div>
)

export const resolveCorkBoardUrl = (url: string | null, projectId: string): string => {
  if (!url) return ''
  if (url.startsWith(CorkBoardUrlScheme.Http) || url.startsWith('/')) return url
  if (url.startsWith('projects/')) return `/${url}`
  return `/projects/${projectId}/${url}`
}
