export enum AccountMenuLabel {
  Settings = 'Settings',
  ApiDocs = 'API Docs',
  Logout = 'Log out',
}

export enum AccountMenuHref {
  ApiDocs = '/api-docs',
  Login = '/login',
}

export enum AccountMenuAria {
  Trigger = 'Account menu',
}

export enum AccountMenuItemId {
  Settings = 'settings',
  ApiDocs = 'api-docs',
  Logout = 'logout',
}

export enum AccountMenuFallback {
  Initial = '?',
}

export enum AccountMenuMetadataKey {
  AvatarUrl = 'avatar_url',
}

export const ACCOUNT_MENU_ITEMS = [
  { id: AccountMenuItemId.Settings, label: AccountMenuLabel.Settings },
  {
    id: AccountMenuItemId.ApiDocs,
    label: AccountMenuLabel.ApiDocs,
    href: AccountMenuHref.ApiDocs,
  },
  { id: AccountMenuItemId.Logout, label: AccountMenuLabel.Logout },
] as const
