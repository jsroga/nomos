/* eslint-disable react-hooks/static-components -- inline episode title component by design */
import React, { useState } from 'react'
import {
  ChevronRight,
  Users,
  Sparkles,
  AlertTriangle,
  Notebook,
  Crown,
  Zap,
  Anchor,
  Skull,
  Swords,
  HelpCircle,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ReferenceText } from '../ReferenceText'

interface EpisodeRoadmapCardProps {
  episode: {
    id?: number
    // StoryArcSchema fields
    name?: string
    description?: string
    mainPlotBeat?: string
    bPlotBeat?: string
    hook?: string
    cliffhanger?: string
    reasoning?: string
    keyFactionsInvolved?: string[]
    consequences?: string[]
    worldConsequence?: string
    // RoadmapEpisodeSchema fields
    title?: string
    logline?: string
    incitingIncident?: string
    midpoint?: string
    finale?: string
    // Shared fields
    protagonistHook?: string
    antagonistMove?: string
    fatalFlaw?: string
    thematicQuestion?: string
    thematicFocus?: string
    actStructure?: string
  }
  index: number
  isLast?: boolean
  className?: string
  factions?: { id: string; name: string }[]
  projectId?: string
}

export const EpisodeRoadmapCard: React.FC<EpisodeRoadmapCardProps> = ({
  episode,
  index,
  isLast = false,
  className,
  factions = [],
  projectId,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showWritersRoom, setShowWritersRoom] = useState(false)

  // Helper: render text with entity references if projectId is available
  const RefText = ({ text, className: cls }: { text: string; className?: string }) =>
    projectId ? (
      <ReferenceText text={text} projectId={projectId} className={cls} inline />
    ) : (
      <span className={cls}>{text}</span>
    )

  // Normalize fields across both schemas
  const episodeTitle = episode.title || episode.name || `Episode ${index + 1}`
  const synopsis = episode.logline || episode.description || ''

  // Clean the description by stripping metadata lines
  const parseDescription = (text: string) => {
    if (!text) return { cleanText: '', extracted: {} as any }
    const extracted: any = {}
    let cleanText = text

    const factionMatch = text.match(/Key factions?:?\s*([^.]+(?:\([^)]+\)[^.]*)*)\./i)
    if (factionMatch) {
      extracted.factions = factionMatch[1]
      cleanText = cleanText.replace(factionMatch[0], '')
    }
    const focusMatch = text.match(/Main focus:?\s*([^.]+)\./i)
    if (focusMatch) {
      extracted.focus = focusMatch[1]
      cleanText = cleanText.replace(focusMatch[0], '')
    }
    const worldMatch = text.match(/World consequence:?\s*(.+)$/i)
    if (worldMatch) {
      extracted.worldConsequence = worldMatch[1]
      cleanText = cleanText.replace(worldMatch[0], '')
    }
    return { cleanText: cleanText.trim(), extracted }
  }

  const { cleanText: cleanDescription, extracted: parsedMeta } = parseDescription(
    episode.description || ''
  )

  // Resolve faction IDs to names
  const resolveFaction = (val: string) => {
    const byId = factions.find(f => f.id === val || f.id === val.toLowerCase())
    return byId ? byId.name : val
  }

  // Collect structural beats for the card grid
  const structuralBeats = [
    episode.protagonistHook && { label: 'Protagonist Hook', value: episode.protagonistHook, icon: Anchor, color: 'text-emerald-400' },
    episode.antagonistMove && { label: 'Antagonist Move', value: episode.antagonistMove, icon: Swords, color: 'text-rose-400' },
    episode.fatalFlaw && { label: 'Fatal Flaw', value: episode.fatalFlaw, icon: Skull, color: 'text-red-400' },
    episode.thematicQuestion && { label: 'Thematic Question', value: episode.thematicQuestion, icon: HelpCircle, color: 'text-blue-400' },
  ].filter(Boolean) as { label: string; value: string; icon: React.ElementType; color: string }[]

  // Act structure timeline (from RoadmapEpisodeSchema)
  const actBeats = [
    episode.incitingIncident && { label: 'Inciting Incident', value: episode.incitingIncident },
    episode.midpoint && { label: 'Midpoint', value: episode.midpoint },
    episode.finale && { label: 'Finale', value: episode.finale },
  ].filter(Boolean) as { label: string; value: string }[]

  // A/B story threads (from StoryArcSchema)
  const hasStoryThreads = episode.mainPlotBeat || episode.bPlotBeat

  // Writer's room metadata
  const hasWritersNotes =
    episode.reasoning ||
    episode.consequences?.length ||
    episode.worldConsequence ||
    parsedMeta.factions ||
    parsedMeta.focus ||
    parsedMeta.worldConsequence

  // Key beats (hook/cliffhanger from StoryArcSchema)
  const hasKeyBeats = episode.hook || episode.cliffhanger

  return (
    <div className={cn('group', className)}>
      {/* Collapsed view */}
      <div
        className={cn(
          'flex items-start gap-4 py-3.5 px-4 cursor-pointer transition-all duration-200 rounded-lg',
          'hover:bg-white/[0.03]',
          isExpanded && 'bg-white/[0.02]'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Episode Number */}
        <div
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm transition-colors mt-0.5',
            isExpanded
              ? 'bg-purple-500/20 text-purple-300'
              : 'bg-white/5 text-muted-foreground group-hover:bg-purple-500/10 group-hover:text-purple-400'
          )}
        >
          {index + 1}
        </div>

        {/* Title + Synopsis */}
        <div className="flex-1 min-w-0">
          <h4
            className={cn(
              'font-semibold text-sm transition-colors',
              isExpanded ? 'text-white' : 'text-foreground/90 group-hover:text-white'
            )}
          >
            {episodeTitle}
          </h4>
          {synopsis && (
            <div className="text-xs text-muted-foreground/70 mt-1 line-clamp-2 leading-relaxed">
              <RefText text={synopsis} />
            </div>
          )}
        </div>

        {/* Expand chevron */}
        <ChevronRight
          size={16}
          className={cn(
            'flex-shrink-0 text-muted-foreground/40 transition-transform duration-200 mt-1',
            isExpanded && 'rotate-90'
          )}
        />
      </div>

      {/* Expanded view */}
      {isExpanded && (
        <div className="pl-14 pr-4 pb-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Full synopsis */}
          {synopsis && (
            <div className="text-sm text-muted-foreground/80 leading-relaxed">
              <RefText text={synopsis} />
            </div>
          )}
          {/* Additional description if it differs from synopsis */}
          {cleanDescription && cleanDescription !== synopsis && (
            <div className="text-sm text-muted-foreground/80 leading-relaxed">
              <RefText text={cleanDescription} />
            </div>
          )}

          {/* Act Structure Timeline */}
          {actBeats.length > 0 && (
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
                  Act Structure
                </span>
              </div>
              <div className="flex items-start gap-3">
                {actBeats.map((beat, i) => (
                  <React.Fragment key={beat.label}>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-semibold text-purple-400/70 uppercase tracking-wider block mb-1">
                        {beat.label}
                      </span>
                      <div className="text-xs text-muted-foreground/70 leading-relaxed">
                        <RefText text={beat.value} />
                      </div>
                    </div>
                    {i < actBeats.length - 1 && (
                      <ArrowRight size={14} className="text-muted-foreground/20 flex-shrink-0 mt-3" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Structural Beats Grid */}
          {structuralBeats.length > 0 && (
            <div className={cn(
              'grid gap-4',
              structuralBeats.length === 1 ? 'grid-cols-1' :
                structuralBeats.length <= 2 ? 'grid-cols-1 md:grid-cols-2' :
                  'grid-cols-1 md:grid-cols-2'
            )}>
              {structuralBeats.map(beat => {
                const Icon = beat.icon
                return (
                  <div key={beat.label} className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Icon size={12} className={cn(beat.color, 'opacity-70')} />
                      <span className={cn('text-[10px] font-semibold uppercase tracking-widest', beat.color, 'opacity-70')}>
                        {beat.label}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground/70 leading-relaxed">
                      <RefText text={beat.value} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* A/B Story Threads (StoryArcSchema backwards compat) */}
          {hasStoryThreads && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5">
              {episode.mainPlotBeat && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-indigo-400/80 uppercase tracking-widest">
                    A-Story
                  </span>
                  <div className="text-xs text-muted-foreground/70 leading-relaxed">
                    <RefText text={episode.mainPlotBeat} />
                  </div>
                </div>
              )}
              {episode.bPlotBeat && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-pink-400/80 uppercase tracking-widest">
                    B-Story
                  </span>
                  <div className="text-xs text-muted-foreground/70 leading-relaxed">
                    <RefText text={episode.bPlotBeat} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Key Beats — Hook / Cliffhanger */}
          {hasKeyBeats && (
            <div className="flex flex-wrap gap-4 text-xs pt-2 border-t border-white/5">
              {episode.hook && (
                <div className="flex items-start gap-2 flex-1 min-w-[200px]">
                  <Sparkles size={12} className="text-yellow-500/60 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] font-semibold text-yellow-400/70 uppercase tracking-wider block mb-0.5">Hook</span>
                    <span className="text-muted-foreground/60 italic">"<RefText text={episode.hook} />"</span>
                  </div>
                </div>
              )}
              {episode.cliffhanger && (
                <div className="flex items-start gap-2 flex-1 min-w-[200px]">
                  <AlertTriangle size={12} className="text-red-400/60 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] font-semibold text-red-400/70 uppercase tracking-wider block mb-0.5">Cliffhanger</span>
                    <span className="text-muted-foreground/60 italic">"<RefText text={episode.cliffhanger} />"</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Writer's Room (hidden by default) */}
          {hasWritersNotes && (
            <div className="pt-2 border-t border-white/5">
              <button
                onClick={e => {
                  e.stopPropagation()
                  setShowWritersRoom(!showWritersRoom)
                }}
                className="flex items-center gap-2 text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors uppercase tracking-widest"
              >
                <Notebook size={12} />
                Writer's Room {showWritersRoom ? '▾' : '▸'}
              </button>

              {showWritersRoom && (
                <div className="mt-3 space-y-3 text-xs text-muted-foreground/50 animate-in fade-in duration-150">
                  {parsedMeta.factions && (
                    <div className="flex gap-2">
                      <Crown size={12} className="text-orange-400/40 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-[9px] uppercase tracking-wider opacity-60 block mb-0.5">Key Factions</span>
                        <span>
                          {parsedMeta.factions
                            .split(',')
                            .map((part: string, i: number, arr: string[]) => {
                              const formatted = part
                                .replace(/([\w\s-]+)?\s*\(?(f\d+)\)?/i, (_: string, _nameContext: string, id: string) => resolveFaction(id))
                                .trim()
                              return (
                                <React.Fragment key={i}>
                                  {formatted}
                                  {i < arr.length - 1 && ', '}
                                </React.Fragment>
                              )
                            })}
                        </span>
                      </div>
                    </div>
                  )}

                  {parsedMeta.focus && (
                    <div className="flex gap-2">
                      <Users size={12} className="text-blue-400/40 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-[9px] uppercase tracking-wider opacity-60 block mb-0.5">Main Focus</span>
                        <span>{parsedMeta.focus}</span>
                      </div>
                    </div>
                  )}

                  {(episode.worldConsequence || parsedMeta.worldConsequence) && (
                    <div className="flex gap-2">
                      <Zap size={12} className="text-red-400/40 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-[9px] uppercase tracking-wider opacity-60 block mb-0.5">World Impact</span>
                        <span>{episode.worldConsequence || parsedMeta.worldConsequence}</span>
                      </div>
                    </div>
                  )}

                  {episode.consequences && episode.consequences.length > 0 && (
                    <div>
                      <span className="text-[9px] uppercase tracking-wider opacity-60 block mb-1">Ripple Effects</span>
                      <ul className="space-y-1 pl-1">
                        {episode.consequences.map((c, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="opacity-40">•</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {episode.reasoning && (
                    <div>
                      <span className="text-[9px] uppercase tracking-wider opacity-60 block mb-0.5">Showrunner Notes</span>
                      <p className="text-emerald-500/50 italic">{episode.reasoning}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
