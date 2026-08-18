'use client'

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import {
  SidebarCollapseCopy,
  SidebarShellClass,
} from '@/components/DomainSidebar/constants/domain-sidebar'

interface DomainSidebarCollapseButtonProps {
  collapsed: boolean
  onClick: () => void
}

export function DomainSidebarCollapseButton({
  collapsed,
  onClick,
}: DomainSidebarCollapseButtonProps) {
  const label = collapsed ? SidebarCollapseCopy.Expand : SidebarCollapseCopy.Collapse
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose

  return (
    <button
      type={HtmlElementType.Button}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={SidebarShellClass.CollapseButton}
    >
      <Icon size={14} strokeWidth={1.7} />
    </button>
  )
}
