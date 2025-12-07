
import React from 'react'
import { Scale, AlertTriangle, BookOpen } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { WorldRule } from '../schemas/agent-schemas'

interface WorldRuleCardProps {
    rule: WorldRule
    className?: string
}

export const WorldRuleCard: React.FC<WorldRuleCardProps> = ({ rule, className }) => {
    const getIcon = () => {
        switch (rule.category) {
            case 'Magic':
            case 'Physics':
                return <ZapIcon className="w-4 h-4 text-blue-400" />
            case 'Politics':
            case 'Society':
                return <Scale className="w-4 h-4 text-yellow-400" />
            default:
                return <BookOpen className="w-4 h-4 text-purple-400" />
        }
    }

    return (
        <Card className={`bg-muted/20 ${className}`}>
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <div className="mt-1 p-1.5 rounded-md bg-background border border-border">
                        {getIcon()}
                    </div>
                    <div className="flex-1 space-y-2">
                        <div>
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm">{rule.rule}</h4>
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border px-1.5 py-0.5 rounded">
                                    {rule.category}
                                </span>
                            </div>
                        </div>

                        <div className="text-xs flex items-start gap-2 text-muted-foreground bg-red-500/5 p-2 rounded border border-red-500/10">
                            <AlertTriangle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                            <span>
                                <span className="font-semibold text-red-400">Consequence: </span>
                                {rule.consequence}
                            </span>
                        </div>

                        {rule.exceptions && (
                            <div className="text-xs text-muted-foreground italic pl-1 border-l-2 border-border">
                                Exception: {rule.exceptions}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function ZapIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
    )
}
