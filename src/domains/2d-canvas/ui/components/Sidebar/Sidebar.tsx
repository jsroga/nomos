import React from 'react'
import { DomainSidebar } from '@/components/DomainSidebar'
import type { WorldGenSidebarState } from '@/domains/2d-canvas/state/hooks/useWorldGenSidebar'
import { WorldGenSidebarHeader, WorldGenSidebarStorageKey } from '../../constants/sidebar'
import { SidebarContent } from './SidebarContent'

interface SidebarProps {
  sidebar: WorldGenSidebarState
}

export const Sidebar: React.FC<SidebarProps> = ({ sidebar }) => {
  return (
    <DomainSidebar
      collapsible
      wordmark={WorldGenSidebarHeader.WorldGen}
      header={WorldGenSidebarHeader.WorldGen}
      storageKey={WorldGenSidebarStorageKey.WorldGen}
    >
      <SidebarContent {...sidebar} />
    </DomainSidebar>
  )
}
