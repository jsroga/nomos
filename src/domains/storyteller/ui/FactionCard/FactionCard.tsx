import React from 'react'
import { Target, Zap, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/Badge'
import { Faction } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/Tooltip'
import { BibleEntityTile, BibleEntityTileClass } from '../BibleEntityTile'
import { RichText } from '../RichText'
import {
  factionTileCopy,
  normalizeFactionGoals,
  normalizeFactionRivals,
  resolveFactionResources,
} from './faction-card-helpers'

interface FactionCardProps {
  faction: Faction
  projectId?: string
  className?: string
}

export enum FactionCardCopy {
  Weakness = 'Weakness',
  Rivals = 'Rivals',
  Goals = 'Goals',
  PoliticalForces = 'Political Forces',
  Resources = 'Resources',
  NoGoals = 'No goals defined',
}

export enum FactionCardClass {
  Ideology = 'text-xs text-muted-foreground/50 italic font-sans mt-1',
}

export const FactionCard: React.FC<FactionCardProps> = ({ faction, projectId, className }) => {
  const goals = normalizeFactionGoals(faction)
  const rivals = normalizeFactionRivals(faction)
  const { resources, politicalForces } = resolveFactionResources(faction)
  const copy = factionTileCopy(faction)

  return (
    <TooltipProvider>
      <BibleEntityTile
        className={className}
        projectId={projectId}
        title={copy.title}
        description={copy.description}
        trailing={
          faction.weaknesses || rivals.length > 0 ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-1 rounded-full hover:bg-red-500/10 transition-colors group">
                  <ShieldAlert className="w-4 h-4 text-red-400/40 group-hover:text-red-400/80" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="p-4 max-w-xs">
                <div className="space-y-3">
                  {faction.weaknesses && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-red-400/80 uppercase tracking-widest">
                        {FactionCardCopy.Weakness}
                      </div>
                      <div className="text-sm text-foreground/80 leading-relaxed">
                        <RichText text={faction.weaknesses} projectId={projectId} inline />
                      </div>
                    </div>
                  )}
                  {rivals.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-border/20">
                      <div className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest">
                        {FactionCardCopy.Rivals}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {rivals.map((rival, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-[10px] border-amber-500/20 text-amber-400/80 py-0 px-1.5"
                          >
                            <RichText text={rival} projectId={projectId} inline />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ) : null
        }
        meta={
          <p className={FactionCardClass.Ideology}>
            "<RichText text={faction.ideology} projectId={projectId} inline />"
          </p>
        }
      >
        <div>
          <div className={BibleEntityTileClass.SectionLabel}>
            <Target className="w-3 h-3" /> {FactionCardCopy.Goals}
          </div>
          <ul className="space-y-1.5 ml-1">
            {goals.map((goal, i) => (
              <li key={i} className="text-xs text-foreground/70 flex items-start gap-2">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400/40 shrink-0" />
                <RichText text={goal} projectId={projectId} inline />
              </li>
            ))}
            {goals.length === 0 && (
              <li className="text-xs text-muted-foreground/40 italic">{FactionCardCopy.NoGoals}</li>
            )}
          </ul>
        </div>

        {resources ? (
          <div>
            <div className={BibleEntityTileClass.SectionLabel}>
              <Zap className="w-3 h-3" />{' '}
              {politicalForces ? FactionCardCopy.PoliticalForces : FactionCardCopy.Resources}
            </div>
            <p className="text-xs text-foreground/70 ml-1 leading-relaxed">
              <RichText text={resources} projectId={projectId} inline />
            </p>
          </div>
        ) : null}
      </BibleEntityTile>
    </TooltipProvider>
  )
}
