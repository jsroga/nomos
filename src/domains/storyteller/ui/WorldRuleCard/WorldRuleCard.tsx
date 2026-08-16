import React from 'react'
import { WorldRule } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import { worldRuleTileCopy } from '@/domains/storyteller/core/entities/world-rule-wire'
import { cn } from '@/shared/data/utils'
import { BibleEntityTile, BibleEntityTileClass } from '../BibleEntityTile'
import { RichText } from '../RichText'
import { resolveWorldRuleCategoryStyle } from './constants/world-rule-display'

interface WorldRuleCardProps {
  rule: WorldRule
  projectId?: string
  className?: string
}

export enum WorldRuleCardCopy {
  MissingRule = 'No rule content provided',
  MissingConsequence = 'No consequence specified.',
  Exception = 'Exception',
  General = 'General',
}

export const WorldRuleCard: React.FC<WorldRuleCardProps> = ({ rule, projectId, className }) => {
  const style = resolveWorldRuleCategoryStyle(rule.category || '')
  const copy = worldRuleTileCopy(rule)

  return (
    <BibleEntityTile
      className={className}
      projectId={projectId}
      eyebrow={
        <span
          className={cn(
            'text-[10px] uppercase tracking-[0.15em] font-mono font-bold opacity-70',
            style.color
          )}
        >
          {rule.category || WorldRuleCardCopy.General}
        </span>
      }
      title={copy.title || WorldRuleCardCopy.MissingRule}
      description={copy.description || WorldRuleCardCopy.MissingConsequence}
    >
      {rule.exceptions ? (
        <div>
          <div className={BibleEntityTileClass.SectionLabel}>{WorldRuleCardCopy.Exception}</div>
          <p className="text-xs text-foreground/70 italic">
            <RichText text={rule.exceptions} projectId={projectId} inline />
          </p>
        </div>
      ) : null}
    </BibleEntityTile>
  )
}
