import React from 'react'
import { Crown, Target, Zap, ShieldAlert } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Faction } from '../schemas/agent-schemas'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface FactionCardProps {
  faction: Faction
  className?: string
}

export const FactionCard: React.FC<FactionCardProps> = ({ faction, className }) => {
  return (
    <TooltipProvider>
      <Card
        className={`h-full bg-muted/5 border-border/30 hover:bg-muted/10 transition-colors ${className}`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 font-syne">
              <Crown className="w-4 h-4 text-amber-400/80" />
              {faction.name}
            </CardTitle>
            {(faction.weaknesses || (faction.rivals && faction.rivals.length > 0)) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="p-1 rounded-full hover:bg-red-500/10 transition-colors group">
                    <ShieldAlert className="w-4 h-4 text-red-400/40 group-hover:text-red-400/80" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="p-4 max-w-xs bg-popover border-border/40">
                  <div className="space-y-3">
                    {faction.weaknesses && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-red-400/80 uppercase tracking-widest">
                          Weakness
                        </div>
                        <div className="text-sm text-foreground/80 leading-relaxed">
                          {faction.weaknesses}
                        </div>
                      </div>
                    )}
                    {faction.rivals && faction.rivals.length > 0 && (
                      <div className="space-y-2 pt-3 border-t border-border/20">
                        <div className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest">
                          Rivals
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {faction.rivals.map((rival, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-[10px] border-amber-500/20 text-amber-400/80 py-0 px-1.5"
                            >
                              {rival}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="text-xs text-muted-foreground/50 italic font-sans mt-1">
            "{faction.ideology}"
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm font-sans">
          {/* Goals */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-muted-foreground/50 font-bold text-[10px] uppercase tracking-widest">
              <Target className="w-3 h-3" /> Goals
            </div>
            <ul className="space-y-1.5 ml-1">
              {faction.goals?.map((goal, i) => (
                <li key={i} className="text-xs text-foreground/70 flex items-start gap-2">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400/40 shrink-0" />
                  {goal}
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <div className="flex items-center gap-2 mb-1 text-muted-foreground/50 font-bold text-[10px] uppercase tracking-widest">
              <Zap className="w-3 h-3" /> Resources
            </div>
            <p className="text-xs text-foreground/70 ml-1 leading-relaxed">{faction.resources}</p>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
