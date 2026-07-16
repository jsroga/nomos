import React from 'react'
import { Sparkles, Building2, Cpu, Users, Eye, Atom } from 'lucide-react'
import { Card, CardContent } from '@/components/Card'
import { WorldRule } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import { cn } from '@/shared/data/utils'
import { RichText } from '../RichText'
import {
  WORLD_RULE_CATEGORY_DEFAULT,
  WORLD_RULE_CATEGORY_MATCHES,
} from './constants/world-rule-display'

interface WorldRuleCardProps {
  rule: WorldRule
  projectId?: string
  className?: string
}

const CATEGORY_ICONS = [Sparkles, Building2, Cpu, Users, Eye, Atom, Sparkles] as const

export const WorldRuleCard: React.FC<WorldRuleCardProps> = ({ rule, projectId, className }) => {
  const categoryLower = (rule.category || '').toLowerCase()

  const getCategoryStyle = () => {
    for (let index = 0; index < WORLD_RULE_CATEGORY_MATCHES.length; index++) {
      const match = WORLD_RULE_CATEGORY_MATCHES[index]
      if (match.keywords.some(keyword => categoryLower.includes(keyword))) {
        return {
          color: match.color,
          bg: match.bg,
          icon: CATEGORY_ICONS[index] ?? Sparkles,
        }
      }
    }

    return {
      ...WORLD_RULE_CATEGORY_DEFAULT,
      icon: Sparkles,
    }
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
