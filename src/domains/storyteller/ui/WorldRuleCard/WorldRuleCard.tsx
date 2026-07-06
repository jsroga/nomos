import React from 'react'
import { Sparkles, Building2, Cpu, Users, Eye, Atom } from 'lucide-react'
import { Card, CardContent } from '@/components/Card'
import { WorldRule } from '@/domains/storyteller/prompts/schemas/agent-schemas'
import { cn } from '@/shared/data/utils'
import { RichText } from '../RichText'

interface WorldRuleCardProps {
  rule: WorldRule
  projectId?: string
  className?: string
}

export const WorldRuleCard: React.FC<WorldRuleCardProps> = ({ rule, projectId, className }) => {
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
    <Card
      className={cn(
        'group cursor-default transition-all duration-300 border hover:border-primary/30 bg-card/40 backdrop-blur-sm',
        className
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={cn('p-2 rounded-lg shrink-0', style.bg)}>
            <IconComponent className={cn('w-5 h-5', style.color)} />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'text-[10px] uppercase tracking-[0.15em] font-mono font-bold opacity-70',
                  style.color
                )}
              >
                {typeof rule === 'string' ? 'World Lore' : rule.category || 'General'}
              </span>
            </div>

            <p className="font-syne font-bold text-[16px] text-foreground leading-tight">
              <RichText
                text={typeof rule === 'string' ? rule : rule.rule || 'No rule content provided'}
                projectId={projectId}
                inline
              />
            </p>

            <p className="text-sm text-muted-foreground/80 leading-relaxed">
              <RichText
                text={
                  typeof rule === 'string'
                    ? 'The logical consistency of the world may be compromised if this lore is ignored.'
                    : rule.consequence || 'No consequence specified.'
                }
                projectId={projectId}
                inline
              />
            </p>

            {typeof rule !== 'string' && rule.exceptions && (
              <div className="pt-2 flex items-start gap-2 border-t border-border/10 mt-2">
                <span className="text-[9px] uppercase font-bold text-muted-foreground/60 shrink-0 mt-0.5">
                  Exception:
                </span>
                <span className="text-xs text-muted-foreground/80 italic">
                  <RichText text={rule.exceptions} projectId={projectId} inline />
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
