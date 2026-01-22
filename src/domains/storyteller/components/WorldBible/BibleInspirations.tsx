import React from 'react'
import { Lightbulb, RefreshCw, Book, Film, Gamepad2 } from 'lucide-react'
import { StoryPlan, InspirationItem } from '../../schemas/agent-schemas'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import { useBible } from './BibleContext'

interface BibleInspirationsProps {}

export const BibleInspirations: React.FC<BibleInspirationsProps> = () => {
  const {
    storyPlan,
    isEditing,
    localPlan,
    updateInspiration: onInspirationChange,
    isReadOnly,
    onSendMessage,
  } = useBible()

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-emerald-400/80" />
          <h3 className="font-syne font-bold text-lg">Inspirations</h3>
        </div>
        {!isReadOnly && onSendMessage && (
          <button
            onClick={() =>
              onSendMessage(
                'Generate diverse inspirations for this world - include relevant books, movies, and games. For each, provide the exact title and 1-2 sentences describing what it is and why it\'s thematically relevant.'
              )
            }
            className="p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105"
            title="Generate Inspirations"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>
      <TooltipProvider>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* BOOKS */}
          <div className="p-4 bg-muted/5 border border-border/30 rounded-xl">
            <div className="flex items-center gap-2 mb-3 text-emerald-400/70 font-mono text-[10px] uppercase tracking-widest">
              <Book className="w-3.5 h-3.5" /> Books
            </div>
            {isEditing ? (
              <textarea
                className="w-full h-16 p-2 bg-background border border-border rounded text-xs font-mono resize-none"
                placeholder="Comma separated..."
                value={(localPlan.inspirations?.books || [])
                  .map((item: string | InspirationItem) =>
                    typeof item === 'string' ? item : item.title
                  )
                  .join(', ')}
                onChange={e => onInspirationChange('books', e.target.value)}
              />
            ) : (
              <div className="space-y-1">
                {storyPlan.inspirations?.books?.length ? (
                  storyPlan.inspirations.books.map((item: InspirationItem, i: number) => {
                    const title = typeof item === 'string' ? item : item.title
                    const description = typeof item === 'object' ? item.description : null
                    return description ? (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(title + ' book')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-xs text-muted-foreground/70 font-sans hover:text-foreground transition-colors"
                          >
                            {title}
                          </a>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs font-sans text-xs">
                          <p>{description}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <a
                        key={i}
                        href={`https://www.google.com/search?q=${encodeURIComponent(title + ' book')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-muted-foreground/70 font-sans hover:text-foreground transition-colors"
                      >
                        {title}
                      </a>
                    )
                  })
                ) : (
                  <div className="text-xs text-muted-foreground/40 font-sans italic">None</div>
                )}
              </div>
            )}
          </div>

          {/* MOVIES */}
          <div className="p-4 bg-muted/5 border border-border/30 rounded-xl">
            <div className="flex items-center gap-2 mb-3 text-rose-400/70 font-mono text-[10px] uppercase tracking-widest">
              <Film className="w-3.5 h-3.5" /> Movies
            </div>
            {isEditing ? (
              <textarea
                className="w-full h-16 p-2 bg-background border border-border rounded text-xs font-mono resize-none"
                placeholder="Comma separated..."
                value={(localPlan.inspirations?.movies || [])
                  .map((item: string | InspirationItem) =>
                    typeof item === 'string' ? item : item.title
                  )
                  .join(', ')}
                onChange={e => onInspirationChange('movies', e.target.value)}
              />
            ) : (
              <div className="space-y-1">
                {storyPlan.inspirations?.movies?.length ? (
                  storyPlan.inspirations.movies.map((item: InspirationItem, i: number) => {
                    const title = typeof item === 'string' ? item : item.title
                    const description = typeof item === 'object' ? item.description : null
                    return description ? (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(title + ' movie')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-xs text-muted-foreground/70 font-sans hover:text-foreground transition-colors"
                          >
                            {title}
                          </a>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs font-sans text-xs">
                          <p>{description}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <a
                        key={i}
                        href={`https://www.google.com/search?q=${encodeURIComponent(title + ' movie')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-muted-foreground/70 font-sans hover:text-foreground transition-colors"
                      >
                        {title}
                      </a>
                    )
                  })
                ) : (
                  <div className="text-xs text-muted-foreground/40 font-sans italic">None</div>
                )}
              </div>
            )}
          </div>

          {/* GAMES */}
          <div className="p-4 bg-muted/5 border border-border/30 rounded-xl">
            <div className="flex items-center gap-2 mb-3 text-violet-400/70 font-mono text-[10px] uppercase tracking-widest">
              <Gamepad2 className="w-3.5 h-3.5" /> Games
            </div>
            {isEditing ? (
              <textarea
                className="w-full h-16 p-2 bg-background border border-border rounded text-xs font-mono resize-none"
                placeholder="Comma separated..."
                value={(localPlan.inspirations?.games || [])
                  .map((item: string | InspirationItem) =>
                    typeof item === 'string' ? item : item.title
                  )
                  .join(', ')}
                onChange={e => onInspirationChange('games', e.target.value)}
              />
            ) : (
              <div className="space-y-1">
                {storyPlan.inspirations?.games?.length ? (
                  storyPlan.inspirations.games.map((item: InspirationItem, i: number) => {
                    const title = typeof item === 'string' ? item : item.title
                    const description = typeof item === 'object' ? item.description : null
                    return description ? (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(title + ' game')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-xs text-muted-foreground/70 font-sans hover:text-foreground transition-colors"
                          >
                            {title}
                          </a>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs font-sans text-xs">
                          <p>{description}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <a
                        key={i}
                        href={`https://www.google.com/search?q=${encodeURIComponent(title + ' game')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-muted-foreground/70 font-sans hover:text-foreground transition-colors"
                      >
                        {title}
                      </a>
                    )
                  })
                ) : (
                  <div className="text-xs text-muted-foreground/40 font-sans italic">None</div>
                )}
              </div>
            )}
          </div>
        </div>
      </TooltipProvider>
    </section>
  )
}
