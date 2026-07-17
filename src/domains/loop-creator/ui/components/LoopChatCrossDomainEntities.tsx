'use client'

import React from 'react'
import { Layers } from 'lucide-react'
import { Badge } from '@/components/Badge'
import { EntitySelectorButton } from '@/components/EntityPicker'

interface LoopChatCrossDomainEntitiesProps {
  projectId: string
  onSendMessage: (message: string) => void
}

export function LoopChatCrossDomainEntities({
  projectId,
  onSendMessage,
}: LoopChatCrossDomainEntitiesProps) {
  return (
    <div className="mt-4 border-t border-border/10 pt-4 px-4 pb-2">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Layers className="w-3 h-3 text-purple-400" />
        <span className="text-[10px] text-muted-foreground/80 font-medium uppercase tracking-widest">
          Cross-Domain Entities
        </span>
        <Badge
          variant="outline"
          className="text-[9px] px-1.5 py-0 bg-purple-500/10 text-purple-400 border-purple-500/30"
        >
          NEW
        </Badge>
      </div>
      <div className="px-1 mb-3">
        <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
          Reference characters, locations, and other entities from Storyteller and other domains
        </p>
      </div>
      <div className="flex flex-wrap gap-2 px-1">
        <EntitySelectorButton
          projectId={projectId}
          onSelectEntity={entity => {
            onSendMessage(
              `Design mechanics for @${entity.name} (${entity.entityType} from ${entity.sourceDomain})`,
            )
          }}
          filterType="character"
          label="Add Character"
        />
        <EntitySelectorButton
          projectId={projectId}
          onSelectEntity={entity => {
            onSendMessage(`Create gameplay for @${entity.name} (${entity.entityType})`)
          }}
          filterType="location"
          label="Add Location"
        />
        <EntitySelectorButton
          projectId={projectId}
          onSelectEntity={entity => {
            onSendMessage(`Reference @${entity.name} in this loop design`)
          }}
          label="Browse All"
        />
      </div>
    </div>
  )
}
