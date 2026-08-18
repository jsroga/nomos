'use client'

import * as React from 'react'
import { cn } from '@/shared/data/utils'
import { ScrollArea } from '@/components/ScrollArea'
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_DEFAULT_WIDTH,
  SidebarHeaderClass,
  SidebarPosition,
  SidebarShellClass,
} from '@/components/DomainSidebar/constants/domain-sidebar'
import { DomainSidebarCollapseButton } from './DomainSidebarCollapseButton'
import { useDomainSidebarCollapsed } from './use-domain-sidebar-collapsed'
import { useDomainSidebarWidth } from './use-domain-sidebar-width'

export * from './DomainSidebarControls'

interface DomainSidebarProps {
  header: React.ReactNode
  children: React.ReactNode
  className?: string
  storageKey?: string
  defaultWidth?: number
  position?: `${SidebarPosition}`
  rawContent?: boolean
  collapsible?: boolean
  collapseStorageId?: string
  wordmark?: string
  footer?: React.ReactNode
}

function resolveWordmark(header: React.ReactNode, wordmark?: string): string | undefined {
  if (wordmark) return wordmark
  if (typeof header === 'string') return header
  return undefined
}

export const DomainSidebar: React.FC<DomainSidebarProps> = ({
  header,
  children,
  className,
  storageKey,
  defaultWidth = SIDEBAR_DEFAULT_WIDTH,
  position = SidebarPosition.Left,
  rawContent = false,
  collapsible = false,
  collapseStorageId,
  wordmark,
  footer,
}) => {
  const sidebarRef = React.useRef<HTMLDivElement>(null)
  const { width, isResizing, handleMouseDown } = useDomainSidebarWidth({
    storageKey,
    defaultWidth,
    position,
    sidebarRef,
  })
  const { collapsed, toggleCollapsed } = useDomainSidebarCollapsed({
    enabled: collapsible,
    storageKey,
    collapseStorageId,
  })
  const resolvedWordmark = resolveWordmark(header, wordmark)
  const displayWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : width
  const borderClass =
    position === SidebarPosition.Left ? 'border-r border-border/70' : 'border-l border-border/70'

  return (
    <div
      ref={sidebarRef}
      className={cn(
        SidebarShellClass.Root,
        borderClass,
        isResizing && 'select-none',
        className
      )}
      style={{ width: displayWidth }}
    >
      {collapsed ? (
        <DomainSidebarCollapsedRail
          wordmark={resolvedWordmark}
          onExpand={toggleCollapsed}
        />
      ) : (
        <DomainSidebarExpanded
          header={header}
          collapsible={collapsible}
          onCollapse={toggleCollapsed}
          rawContent={rawContent}
          footer={footer}
        >
          {children}
        </DomainSidebarExpanded>
      )}

      {!collapsed && (
        <div
          className={cn(
            'absolute top-0 w-1 h-full cursor-ew-resize transition-all duration-150 ease-in-out z-10',
            'hover:bg-primary/30',
            isResizing && 'bg-primary/50',
            position === SidebarPosition.Left ? 'right-0' : 'left-0'
          )}
          onMouseDown={handleMouseDown}
        />
      )}
    </div>
  )
}

interface DomainSidebarCollapsedRailProps {
  wordmark?: string
  onExpand: () => void
}

function DomainSidebarCollapsedRail({ wordmark, onExpand }: DomainSidebarCollapsedRailProps) {
  return (
    <>
      <div className="h-[50px] shrink-0 w-full flex items-center justify-center border-b border-border/70">
        <DomainSidebarCollapseButton collapsed onClick={onExpand} />
      </div>
      <div className="flex-1 flex items-start justify-center pt-[22px]">
        {wordmark ? <span className={SidebarShellClass.CollapsedWordmark}>{wordmark}</span> : null}
      </div>
    </>
  )
}

interface DomainSidebarExpandedProps {
  header: React.ReactNode
  collapsible: boolean
  onCollapse: () => void
  rawContent: boolean
  footer?: React.ReactNode
  children: React.ReactNode
}

function DomainSidebarExpanded({
  header,
  collapsible,
  onCollapse,
  rawContent,
  footer,
  children,
}: DomainSidebarExpandedProps) {
  return (
    <>
      {header ? (
        <div className={SidebarShellClass.HeaderBand}>
          {typeof header === 'string' ? (
            <h2 className={SidebarHeaderClass.Wordmark}>{header}</h2>
          ) : (
            header
          )}
          <span className="flex-1 min-w-0" />
          {collapsible ? (
            <DomainSidebarCollapseButton collapsed={false} onClick={onCollapse} />
          ) : null}
        </div>
      ) : null}

      {rawContent ? (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">{children}</div>
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <div className={SidebarShellClass.Body}>{children}</div>
        </ScrollArea>
      )}

      {footer ? <div className="shrink-0">{footer}</div> : null}
    </>
  )
}
