import React from 'react'
import { Book, Target } from 'lucide-react'
import { Faction, StoryPlan, WorldRule } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'

interface EpisodePremiseBibleContextProps {
  globalBible: Partial<StoryPlan>
}

export function EpisodePremiseBibleContext({ globalBible }: EpisodePremiseBibleContextProps) {
  return (
    <div className="w-72 border-l border-border bg-muted/10 overflow-y-auto p-4 animate-in slide-in-from-right duration-200">
      <h3 className="font-mono text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-4 border-b border-border pb-2">
        World Context
      </h3>
      <div className="mb-5">
        <h4 className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
          <Target className="w-3 h-3" /> Factions
        </h4>
        <div className="space-y-2">
          {globalBible.factions?.map((f: Faction, i: number) => (
            <div key={i} className="text-xs p-2 bg-background border border-border rounded-md">
              <span className="font-medium block">{f.name}</span>
              <span className="text-muted-foreground">{f.ideology}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
          <Book className="w-3 h-3" /> World Rules
        </h4>
        <ul className="space-y-1.5">
          {globalBible.worldRules?.slice(0, 3).map((r: WorldRule, i: number) => (
            <li key={i} className="text-xs text-muted-foreground pl-1 border-l border-border">
              {r.rule}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
