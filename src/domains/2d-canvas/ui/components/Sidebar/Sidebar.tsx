import React from 'react'
import { DomainSidebar, SidebarHeader } from '@/components/DomainSidebar'
import { useWorldGenSidebar } from '@/domains/2d-canvas/state/hooks/useWorldGenSidebar'
import { WorldGenSidebarHeader, WorldGenSidebarStorageKey } from '../../constants/sidebar'
import { SidebarContent } from './SidebarContent'

export const Sidebar: React.FC = () => {
  const sidebar = useWorldGenSidebar()

  return (
    <DomainSidebar
      header={
        <div className="flex items-center justify-between w-full pl-2">
          <SidebarHeader>{WorldGenSidebarHeader.WorldGen}</SidebarHeader>
        </div>
      }
      storageKey={WorldGenSidebarStorageKey.WorldGen}
    >
      <SidebarContent {...sidebar} />
    </DomainSidebar>
  )
}
