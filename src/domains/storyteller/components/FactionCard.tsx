
import React from 'react'
import { Crown, Target, Zap, ShieldAlert } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Faction } from '../schemas/agent-schemas'

interface FactionCardProps {
    faction: Faction
    className?: string
}

export const FactionCard: React.FC<FactionCardProps> = ({ faction, className }) => {
    return (
        <Card className={`h-full border-l-4 border-l-orange-500/50 ${className}`}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Crown className="w-4 h-4 text-orange-500" />
                        {faction.name}
                    </CardTitle>
                </div>
                <p className="text-sm text-muted-foreground italic">"{faction.ideology}"</p>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                {/* Goals */}
                <div>
                    <div className="flex items-center gap-2 mb-1 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                        <Target className="w-3 h-3" /> Goals
                    </div>
                    <ul className="list-disc list-inside space-y-1 ml-1">
                        {faction.goals.map((goal, i) => (
                            <li key={i}>{goal}</li>
                        ))}
                    </ul>
                </div>

                {/* Resources */}
                <div>
                    <div className="flex items-center gap-2 mb-1 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                        <Zap className="w-3 h-3" /> Resources
                    </div>
                    <p className="ml-1">{faction.resources}</p>
                </div>

                {/* Weaknesses / Rivals */}
                {(faction.weaknesses || (faction.rivals && faction.rivals.length > 0)) && (
                    <div className="pt-2 border-t border-border/50">
                        {faction.weaknesses && (
                            <div className="mb-2">
                                <span className="text-red-400 font-medium text-xs">Weakness: </span>
                                <span>{faction.weaknesses}</span>
                            </div>
                        )}
                        {faction.rivals && faction.rivals.length > 0 && (
                            <div className="flex flex-wrap gap-2 items-center">
                                <ShieldAlert className="w-3 h-3 text-red-500" />
                                <span className="text-xs text-muted-foreground">Rivals:</span>
                                {faction.rivals.map((rival, i) => (
                                    <Badge key={i} variant="outline" className="text-xs border-red-500/20 text-red-400">
                                        {rival}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
