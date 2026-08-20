import {
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  SidebarPosition,
} from '@/components/DomainSidebar/constants/domain-sidebar'

export function clampSidebarWidth(width: number): number {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width))
}

export function sidebarWidthFromPointer(args: {
  position: `${SidebarPosition}`
  clientX: number
  left: number
  right: number
}): number {
  const next =
    args.position === SidebarPosition.Left ? args.clientX - args.left : args.right - args.clientX
  return clampSidebarWidth(next)
}
