import React from 'react'
import { Crown, Zap, Flag, Anchor, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SeasonStructure } from '../schemas/agent-schemas'

interface SeasonOverviewCardProps {
    seasonStructure: SeasonStructure
    className?: string
}

export const SeasonOverviewCard: React.FC<SeasonOverviewCardProps> = ({
    seasonStructure,
    className
}) => {
    return (
        <div className={cn("relative overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur-md p-6 mb-8", className)}>
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -z-10" />

            {/* Header: Season Logline */}
            <div className="mb-6 border-b border-white/5 pb-4">
                <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-lg font-bold text-white tracking-wide">Season Spine</h3>
                </div>
                <p className="text-sm font-medium text-white/90 italic leading-relaxed">
                    "{seasonStructure.seasonLogline}"
                </p>
                {seasonStructure.themeExploration && (
                    <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-purple-400 whitespace-nowrap">Theme Exploration:</span>
                        <span>{seasonStructure.themeExploration}</span>
                    </div>
                )}
            </div>

            {/* Timeline Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Inciting Incident */}
                <div className="relative p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                    <div className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
                        <Zap className="w-3 h-3 text-cyan-400" />
                    </div>
                    <h4 className="text-xs uppercase tracking-wider text-cyan-400 font-bold mb-2 ml-2">Inciting Incident</h4>
                    <p className="text-xs text-white/80 leading-relaxed">
                        {seasonStructure.incitingIncident}
                    </p>
                </div>

                {/* Midpoint */}
                <div className="relative p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                    <div className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500/50 flex items-center justify-center">
                        <Anchor className="w-3 h-3 text-orange-400" />
                    </div>
                    <h4 className="text-xs uppercase tracking-wider text-orange-400 font-bold mb-2 ml-2">Midpoint Climax</h4>
                    <p className="text-xs text-white/80 leading-relaxed">
                        {seasonStructure.midpointClimax}
                    </p>
                </div>

                {/* Season Climax */}
                <div className="relative p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                    <div className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center">
                        <Flag className="w-3 h-3 text-red-400" />
                    </div>
                    <h4 className="text-xs uppercase tracking-wider text-red-400 font-bold mb-2 ml-2">Season Climax</h4>
                    <p className="text-xs text-white/80 leading-relaxed">
                        {seasonStructure.seasonClimax}
                    </p>
                </div>

                {/* Resolution */}
                <div className="relative p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                    <div className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                        <Target className="w-3 h-3 text-green-400" />
                    </div>
                    <h4 className="text-xs uppercase tracking-wider text-green-400 font-bold mb-2 ml-2">Resolution</h4>
                    <p className="text-xs text-white/80 leading-relaxed">
                        {seasonStructure.resolution}
                    </p>
                </div>
            </div>
        </div>
    )
}
