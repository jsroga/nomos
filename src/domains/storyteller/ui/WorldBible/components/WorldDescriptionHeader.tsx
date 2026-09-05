import React from 'react'
import { Globe } from 'lucide-react'
import { BibleSectionHeader } from './BibleSectionChrome'
import { BibleOverviewSectionTitle } from '../constants/bible-overview'

interface WorldDescriptionHeaderProps {
  isReadOnly: boolean
  isWorldDescLoading: boolean
  onGenerate?: () => void
}

export const WorldDescriptionHeader: React.FC<WorldDescriptionHeaderProps> = ({
  isReadOnly,
  isWorldDescLoading,
  onGenerate,
}) => (
  <BibleSectionHeader
    icon={<Globe className="w-5 h-5 text-primary/70" />}
    title={BibleOverviewSectionTitle.Overview}
    isReadOnly={isReadOnly}
    isLoading={isWorldDescLoading}
    onGenerate={onGenerate}
    generateTitle="Generate or refresh world description"
  />
)
