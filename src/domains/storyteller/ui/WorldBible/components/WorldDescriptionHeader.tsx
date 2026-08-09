import React from 'react'
import { Globe } from 'lucide-react'
import { BibleSectionHeader } from './BibleSectionChrome'
import {
  BibleOverviewSectionTitle,
  WORLD_DESCRIPTION_REGEN_PROMPT,
} from '../constants/bible-overview'

interface WorldDescriptionHeaderProps {
  isReadOnly: boolean
  isWorldDescLoading: boolean
  onSendMessage?: (msg: string, section?: string) => void
}

export const WorldDescriptionHeader: React.FC<WorldDescriptionHeaderProps> = ({
  isReadOnly,
  isWorldDescLoading,
  onSendMessage,
}) => (
  <BibleSectionHeader
    icon={<Globe className="w-5 h-5 text-primary/70" />}
    title={BibleOverviewSectionTitle.Overview}
    isReadOnly={isReadOnly}
    isLoading={isWorldDescLoading}
    onGenerate={
      onSendMessage
        ? () => onSendMessage(WORLD_DESCRIPTION_REGEN_PROMPT, 'worldDescription')
        : undefined
    }
    generateTitle="Generate or refresh world description"
  />
)
