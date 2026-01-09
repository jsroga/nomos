import React, { useState } from 'react'
import { Film, ChevronRight, Users, Sparkles, AlertTriangle, Notebook, Crown, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EpisodeRoadmapCardProps {
    episode: {
        id?: number
        name?: string
        logline?: string
        description?: string
        mainPlotBeat?: string
        bPlotBeat?: string
        hook?: string
        cliffhanger?: string
        reasoning?: string
        keyFactionsInvolved?: string[]
        consequences?: string[]
        worldConsequence?: string
    }
    index: number
    isLast?: boolean
    className?: string
    factions?: { id: string; name: string }[]
}

export const EpisodeRoadmapCard: React.FC<EpisodeRoadmapCardProps> = ({
    episode,
    index,
    isLast = false,
    className,
    factions = []
}) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const [showWritersRoom, setShowWritersRoom] = useState(false)

    // Clean the description by stripping metadata lines (Key factions, Main focus, World consequence)
    const parseDescription = (text: string) => {
        if (!text) return { cleanText: '', extracted: {} as any }

        const extracted: any = {}
        let cleanText = text

        // Extract "Key factions: ..." 
        const factionMatch = text.match(/Key factions?:?\s*([^.]+(?:\([^)]+\)[^.]*)*)\./i)
        if (factionMatch) {
            extracted.factions = factionMatch[1]
            cleanText = cleanText.replace(factionMatch[0], '')
        }

        // Extract "Main focus: ..."
        const focusMatch = text.match(/Main focus:?\s*([^.]+)\./i)
        if (focusMatch) {
            extracted.focus = focusMatch[1]
            cleanText = cleanText.replace(focusMatch[0], '')
        }

        // Extract "World consequence: ..." (may span to end of text)
        const worldMatch = text.match(/World consequence:?\s*(.+)$/i)
        if (worldMatch) {
            extracted.worldConsequence = worldMatch[1]
            cleanText = cleanText.replace(worldMatch[0], '')
        }

        return { cleanText: cleanText.trim(), extracted }
    }

    const { cleanText: cleanDescription, extracted: parsedMeta } = parseDescription(episode.description || '')

    // Resolve faction IDs to names
    const resolveFaction = (val: string) => {
        const byId = factions.find(f => f.id === val || f.id === val.toLowerCase())
        return byId ? byId.name : val
    }

    const effectiveFactions = episode.keyFactionsInvolved?.map(resolveFaction)

    // Get the one-liner for collapsed view (prioritize logline, then hook, then first sentence of description)
    const getOneLiner = () => {
        if (episode.logline) return episode.logline
        if (episode.hook) return episode.hook
        if (cleanDescription) {
            const firstSentence = cleanDescription.split('.')[0]
            return firstSentence.length > 120 ? firstSentence.substring(0, 117) + '...' : firstSentence + '.'
        }
        return 'No summary available.'
    }

    const oneLiner = getOneLiner()

    // Check if we have story threads
    const hasStoryThreads = episode.mainPlotBeat || episode.bPlotBeat

    // Check if we have beats
    const hasBeats = episode.hook || episode.cliffhanger

    // Check if we have writer's notes (internal data) - now includes parsed metadata
    const hasWritersNotes = episode.reasoning || episode.consequences?.length || episode.worldConsequence || parsedMeta.factions || parsedMeta.focus || parsedMeta.worldConsequence

    return (
        <div className={cn("group", className)}>
            {/* Collapsed State - The Minimal View */}
            <div
                className={cn(
                    "flex items-center gap-4 py-3 px-4 cursor-pointer transition-all duration-200",
                    "hover:bg-white/[0.03] rounded-lg",
                    isExpanded && "bg-white/[0.02]"
                )}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* Episode Number */}
                <div className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm transition-colors",
                    isExpanded
                        ? "bg-purple-500/20 text-purple-300"
                        : "bg-white/5 text-muted-foreground group-hover:bg-purple-500/10 group-hover:text-purple-400"
                )}>
                    {index + 1}
                </div>

                {/* Title + Hook */}
                <div className="flex-1 min-w-0">
                    <h4 className={cn(
                        "font-semibold text-sm transition-colors truncate",
                        isExpanded ? "text-white" : "text-foreground/90 group-hover:text-white"
                    )}>
                        {episode.name || `Episode ${index + 1}`}
                    </h4>
                    <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                        {oneLiner}
                    </p>
                </div>

                {/* Expand Indicator */}
                <ChevronRight
                    size={16}
                    className={cn(
                        "flex-shrink-0 text-muted-foreground/40 transition-transform duration-200",
                        isExpanded && "rotate-90"
                    )}
                />
            </div>

            {/* Expanded State - Progressive Disclosure */}
            {isExpanded && (
                <div className="pl-14 pr-4 pb-4 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">

                    {/* Full Synopsis (cleaned) */}
                    {cleanDescription && cleanDescription !== oneLiner && (
                        <p className="text-sm text-muted-foreground/80 leading-relaxed">
                            {cleanDescription}
                        </p>
                    )}

                    {/* Story Threads (A/B Plot) */}
                    {hasStoryThreads && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {episode.mainPlotBeat && (
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-semibold text-indigo-400/80 uppercase tracking-widest">The A-Story</span>
                                    <p className="text-xs text-muted-foreground/70 leading-relaxed">{episode.mainPlotBeat}</p>
                                </div>
                            )}
                            {episode.bPlotBeat && (
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-semibold text-pink-400/80 uppercase tracking-widest">Character Arc</span>
                                    <p className="text-xs text-muted-foreground/70 leading-relaxed">{episode.bPlotBeat}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Key Beats (Hook / Cliffhanger) */}
                    {hasBeats && (
                        <div className="flex flex-wrap gap-4 text-xs">
                            {episode.hook && (
                                <div className="flex items-start gap-2 max-w-xs">
                                    <Sparkles size={12} className="text-yellow-500/60 mt-0.5 flex-shrink-0" />
                                    <span className="text-muted-foreground/60 italic">"{episode.hook}"</span>
                                </div>
                            )}
                            {episode.cliffhanger && (
                                <div className="flex items-start gap-2 max-w-xs">
                                    <AlertTriangle size={12} className="text-red-400/60 mt-0.5 flex-shrink-0" />
                                    <span className="text-muted-foreground/60 italic">"{episode.cliffhanger}"</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Metadata Tags - Hidden (moved to Writer's Room) */}

                    {/* Writer's Room Toggle (Hidden by default) */}
                    {hasWritersNotes && (
                        <div className="pt-2 border-t border-white/5">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setShowWritersRoom(!showWritersRoom)
                                }}
                                className="flex items-center gap-2 text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors uppercase tracking-widest"
                            >
                                <Notebook size={12} />
                                Writer's Room {showWritersRoom ? '▼' : '▶'}
                            </button>

                            {showWritersRoom && (
                                <div className="mt-3 space-y-3 text-xs text-muted-foreground/50 animate-in fade-in duration-150">
                                    {/* Parsed metadata from description */}
                                    {parsedMeta.factions && (
                                        <div className="flex gap-2">
                                            <Crown size={12} className="text-orange-400/40 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <span className="text-[9px] uppercase tracking-wider opacity-60 block mb-0.5">Key Factions</span>
                                                <span>
                                                    {parsedMeta.factions.split(',').map((part: string, i: number, arr: string[]) => {
                                                        // Replace "Name (id)" or "(id)" or "id" with the resolved name
                                                        const formatted = part.replace(/([\w\s-]+)?\s*\(?(f\d+)\)?/i, (_, nameContext, id) => {
                                                            return resolveFaction(id)
                                                        }).trim()

                                                        return (
                                                            <React.Fragment key={i}>
                                                                {formatted}
                                                                {i < arr.length - 1 && ", "}
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

            {/* Divider removed for cleaner look */}
        </div>
    )
}
