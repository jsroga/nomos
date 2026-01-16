import React from 'react'
import { AlertTriangle, Info, Sparkles, Building2, Cpu, Users, Eye, Atom } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { WorldRule } from '../schemas/agent-schemas'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface WorldRuleCardProps {
  rule: WorldRule
  className?: string
}

export const WorldRuleCard: React.FC<WorldRuleCardProps> = ({ rule, className }) => {
  // Parse category to get primary type
  const categoryLower = (rule.category || '').toLowerCase()

  const getCategoryStyle = () => {
    if (
      categoryLower.includes('magic') ||
      categoryLower.includes('metaphysics') ||
      categoryLower.includes('gnostic')
    ) {
      return {
        color: 'text-violet-300',
        bg: 'bg-violet-500/15 border-violet-500/20',
        icon: Sparkles,
      }
    }
    if (categoryLower.includes('politic') || categoryLower.includes('visitor')) {
      return { color: 'text-amber-300', bg: 'bg-amber-500/15 border-amber-500/20', icon: Building2 }
    }
    if (categoryLower.includes('tech')) {
      return { color: 'text-cyan-300', bg: 'bg-cyan-500/15 border-cyan-500/20', icon: Cpu }
    }
    if (categoryLower.includes('society') || categoryLower.includes('control')) {
      return { color: 'text-rose-300', bg: 'bg-rose-500/15 border-rose-500/20', icon: Users }
    }
    if (categoryLower.includes('ufo') || categoryLower.includes('perception')) {
      return { color: 'text-emerald-300', bg: 'bg-emerald-500/15 border-emerald-500/20', icon: Eye }
    }
    if (categoryLower.includes('physic') || categoryLower.includes('cost')) {
      return { color: 'text-blue-300', bg: 'bg-blue-500/15 border-blue-500/20', icon: Atom }
    }
    return { color: 'text-purple-300', bg: 'bg-purple-500/15 border-purple-500/20', icon: Sparkles }
  }

  const style = getCategoryStyle()
  const IconComponent = style.icon

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card
            className={`group cursor-default transition-all duration-200 ${style.bg} border hover:scale-[1.01] ${className}`}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <IconComponent className={`w-5 h-5 ${style.color} shrink-0 mt-0.5 opacity-80`} />
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-[15px] text-foreground/90 leading-relaxed mb-3">
                    {rule.rule}
                  </p>
                  <span
                    className={`inline-block text-[9px] uppercase tracking-[0.15em] font-mono ${style.color} opacity-70`}
                  >
                    {rule.category}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="p-4 max-w-sm bg-popover/95 backdrop-blur-md border-border/40"
        >
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-[10px] text-red-400 uppercase tracking-widest">
                  If Broken
                </div>
                <div className="text-sm text-foreground/80 leading-relaxed">{rule.consequence}</div>
              </div>
            </div>
            {rule.exceptions && (
              <div className="flex items-start gap-3 pt-3 border-t border-border/20">
                <Info className="w-4 h-4 text-muted-foreground/60 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-[10px] text-muted-foreground/60 uppercase tracking-widest">
                    Exception
                  </div>
                  <div className="text-sm text-foreground/70 italic">{rule.exceptions}</div>
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
