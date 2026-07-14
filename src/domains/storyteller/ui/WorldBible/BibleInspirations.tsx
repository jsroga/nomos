import { useMemo, type FC } from 'react'
import { recordArrayFromJson, recordFromJson, readString } from '@/shared/data/json-guards'
import { Lightbulb, RefreshCw, Book, Film, Gamepad2, Loader2 } from 'lucide-react'
import { InspirationItem } from '@/domains/storyteller/prompts/schemas/agent-schemas'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/Tooltip'

import { useBible } from './BibleContext'
import { SectionPendingOverlay } from './SectionPendingOverlay'
import {
  BIBLE_INSPIRATION_GAME_KEYWORDS,
  BIBLE_INSPIRATION_GAME_YEAR_PATTERN,
  BIBLE_INSPIRATION_MOVIE_KEYWORDS,
  BIBLE_INSPIRATION_MOVIE_YEAR_PATTERN,
} from './constants/bible-inspirations'

interface BibleInspirationsProps { }

function inspirationItemFromWire(value: unknown): InspirationItem | null {
  if (typeof value === 'string') return { title: value, description: '' }
  const row = recordFromJson(value)
  const title = readString(row.title)
  if (!title) return null
  return { title, description: readString(row.description) ?? '' }
}

function inspirationItemsFromJson(value: unknown): InspirationItem[] {
  return recordArrayFromJson(value)
    .map(inspirationItemFromWire)
    .filter((item): item is InspirationItem => item !== null)
}

export const BibleInspirations: FC<BibleInspirationsProps> = () => {
  const {
    storyPlan,
    isEditing,
    localPlan,
    updateInspiration: onInspirationChange,
    isReadOnly,
    onSendMessage,
    loadingSections,
    pendingActions,
  } = useBible()

  const isLoading = loadingSections?.inspirations?.loading ?? false
  const pendingAction = pendingActions?.inspirations

  // Normalize inspirations - handle both flat array and categorized object formats
  // Use localPlan for display when not editing to show latest saved data
  const normalizedInspirations = useMemo(() => {
    const raw = isEditing ? localPlan.inspirations : (localPlan.inspirations || storyPlan.inspirations)

    // If already in correct format (object with books/movies/games keys)
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const categorized = recordFromJson(raw)
      return {
        books: inspirationItemsFromJson(categorized.books),
        movies: inspirationItemsFromJson(categorized.movies),
        games: inspirationItemsFromJson(categorized.games),
      }
    }

    // If flat array, categorize by detecting type from title
    if (Array.isArray(raw)) {
      const books: InspirationItem[] = []
      const movies: InspirationItem[] = []
      const games: InspirationItem[] = []

      for (const item of raw) {
        const title = typeof item === 'string' ? item : item?.title || ''
        const titleLower = title.toLowerCase()

        // Detect category from title patterns
        if (
          BIBLE_INSPIRATION_GAME_KEYWORDS.some(keyword => titleLower.includes(keyword)) ||
          BIBLE_INSPIRATION_GAME_YEAR_PATTERN.test(titleLower)
        ) {
          games.push(typeof item === 'string' ? { title: item } : item)
        } else if (
          BIBLE_INSPIRATION_MOVIE_KEYWORDS.some(keyword => titleLower.includes(keyword)) ||
          BIBLE_INSPIRATION_MOVIE_YEAR_PATTERN.test(titleLower)
        ) {
          movies.push(typeof item === 'string' ? { title: item } : item)
        } else {
          // Default to books (includes "by Author" patterns)
          books.push(typeof item === 'string' ? { title: item } : item)
        }
      }

      return { books, movies, games }
    }

    return { books: [], movies: [], games: [] }
  }, [isEditing, localPlan.inspirations, storyPlan.inspirations])

  return (
    <section className={isLoading || pendingAction ? 'relative' : ''}>
      {/* Pending action overlay */}
      {pendingAction && (
        <SectionPendingOverlay pendingAction={pendingAction} onReview={pendingAction.onReview} />
      )}
      {isLoading && !pendingAction && (
        <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm rounded-lg flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
            <span>Finding creative references...</span>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-emerald-400/80" />
          <h3 className="font-syne font-bold text-lg">Inspirations</h3>
        </div>
        {!isReadOnly && onSendMessage && (
          <button
            onClick={() =>
              onSendMessage?.(
                'Generate BRAND NEW diverse inspirations for this world - include relevant books, movies, and games. For each, provide the exact title and 1-2 sentences describing what it is and why it\'s thematically relevant. IMPORTANT: Take a completely new creative direction and do NOT repeat previous suggestions.',
                'inspirations'
              )
            }
            className={`p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105 ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
            title="Generate Inspirations"
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
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
                {normalizedInspirations.books?.length ? (
                  normalizedInspirations.books.map((item: InspirationItem, i: number) => {
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
                {normalizedInspirations.movies?.length ? (
                  normalizedInspirations.movies.map((item: InspirationItem, i: number) => {
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
                {normalizedInspirations.games?.length ? (
                  normalizedInspirations.games.map((item: InspirationItem, i: number) => {
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
