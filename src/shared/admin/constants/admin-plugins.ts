/**
 * First-party admin plugins (Track A4). Each dashboard section is authored as a
 * plugin so the contract is proven by its own core features. Registered eagerly
 * on import; the registry seeds the dashboard nav from these.
 */

import { AdminPluginMount, type AdminPlugin } from '@/shared/admin/plugins/types'

const ADMIN_BASE = '/admin'

export const FIRST_PARTY_ADMIN_PLUGINS: readonly AdminPlugin[] = [
  {
    id: 'models',
    label: 'Models',
    mount: AdminPluginMount.AdminSection,
    path: ADMIN_BASE,
    ready: true,
    order: 0,
  },
  {
    id: 'modules',
    label: 'Modules',
    mount: AdminPluginMount.AdminSection,
    path: `${ADMIN_BASE}/modules`,
    ready: true,
    order: 1,
  },
  {
    id: 'tests',
    label: 'Tests',
    mount: AdminPluginMount.AdminSection,
    path: `${ADMIN_BASE}/tests`,
    ready: true,
    order: 2,
  },
  {
    id: 'plugins',
    label: 'Plugins',
    mount: AdminPluginMount.AdminSection,
    path: `${ADMIN_BASE}/plugins`,
    ready: true,
    order: 3,
  },
]
