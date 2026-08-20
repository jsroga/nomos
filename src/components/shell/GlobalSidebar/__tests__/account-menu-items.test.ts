import { describe, expect, it } from 'vitest'
import {
  ACCOUNT_MENU_ITEMS,
  AccountMenuHref,
  AccountMenuItemId,
  AccountMenuLabel,
} from '@/components/shell/GlobalSidebar/constants/global-sidebar'

describe('ACCOUNT_MENU_ITEMS', () => {
  it('is Settings (no href), API Docs (/api-docs), then Logout (no href)', () => {
    expect(ACCOUNT_MENU_ITEMS).toHaveLength(3)

    const [settings, apiDocs, logout] = ACCOUNT_MENU_ITEMS

    expect(settings.id).toBe(AccountMenuItemId.Settings)
    expect(settings.label).toBe(AccountMenuLabel.Settings)
    expect('href' in settings).toBe(false)

    expect(apiDocs.id).toBe(AccountMenuItemId.ApiDocs)
    expect(apiDocs.label).toBe(AccountMenuLabel.ApiDocs)
    expect(apiDocs.href).toBe(AccountMenuHref.ApiDocs)
    expect(AccountMenuHref.ApiDocs).toBe('/api-docs')

    expect(logout.id).toBe(AccountMenuItemId.Logout)
    expect(logout.label).toBe(AccountMenuLabel.Logout)
    expect('href' in logout).toBe(false)
  })
})
