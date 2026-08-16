import React from 'react'
import { cn } from '@/shared/data/utils'
import { ParsedReference } from '@/domains/storyteller/core/entities/reference-parser'
import { EntityReference } from '@/domains/storyteller/core/entities/entity-references'
import { StickyTooltip } from './StickyTooltip'
import { EntityTooltipContent, resolveEntityChipVisuals } from './EntityTooltipContent'

interface EntityChipProps {
  parsedRef: ParsedReference
  entity: EntityReference | null
  isLoading: boolean
  onClick?: (refId: string, entity: EntityReference | null) => void
  onTooltipOpened?: () => void
}

export const EntityChip: React.FC<EntityChipProps> = ({
  parsedRef,
  entity,
  isLoading,
  onClick,
  onTooltipOpened,
}) => {
  const { type, Icon, colorClass } = resolveEntityChipVisuals(parsedRef)

  return (
    <StickyTooltip
      onOpened={onTooltipOpened}
      content={
        <EntityTooltipContent
          parsedRef={parsedRef}
          entity={entity}
          isLoading={isLoading}
          type={type}
          Icon={Icon}
        />
      }
    >
      <button
        type="button"
        onClick={() => onClick?.(parsedRef.refId, entity)}
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md',
          'transition-colors duration-150 cursor-pointer',
          'text-sm font-medium',
          colorClass
        )}
      >
        <Icon size={12} className="shrink-0" />
        <span>{parsedRef.displayName}</span>
      </button>
    </StickyTooltip>
  )
}
