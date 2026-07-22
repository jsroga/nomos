/** Admin dashboard navigation sections. Models is live; the rest are staged. */

export interface AdminNavItem {
  readonly key: string
  readonly label: string
  readonly href: string
  readonly ready: boolean
}

const ADMIN_BASE = '/admin'

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  { key: 'models', label: 'Models', href: ADMIN_BASE, ready: true },
  { key: 'modules', label: 'Modules', href: `${ADMIN_BASE}/modules`, ready: false },
  { key: 'tests', label: 'Tests', href: `${ADMIN_BASE}/tests`, ready: false },
  { key: 'plugins', label: 'Plugins', href: `${ADMIN_BASE}/plugins`, ready: false },
]

export const ADMIN_TITLE = 'Admin'
export const ADMIN_SUBTITLE = 'Platform configuration'
export const ADMIN_SOON_LABEL = 'soon'
