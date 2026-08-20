'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/Avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/DropdownMenu'
import { SettingsDialog } from '@/domains/2d-canvas'
import { useAuthStore } from '@/shared/auth/useAuthStore'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'
import {
  ACCOUNT_MENU_ITEMS,
  AccountMenuAria,
  AccountMenuFallback,
  AccountMenuHref,
  AccountMenuItemId,
  AccountMenuMetadataKey,
} from './constants/global-sidebar'

function accountAvatarUrl(userMetadata: unknown): string | undefined {
  const metadata = recordFromJson(userMetadata)
  return readString(metadata[AccountMenuMetadataKey.AvatarUrl])
}

export function AccountMenu() {
  const user = useAuthStore(state => state.user)
  const currentProject = useWorkspaceProjectStore(state => state.currentProject)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const supabase = createClientComponentClient()

  const email = user?.email
  const initial = (email?.[0] ?? AccountMenuFallback.Initial).toUpperCase()
  const avatarUrl = user ? accountAvatarUrl(user.user_metadata) : undefined

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = AccountMenuHref.Login
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={AccountMenuAria.Trigger}
            className="rounded-full border-0 bg-transparent p-0"
          >
            <Avatar className="h-8 w-8 cursor-pointer border border-border hover:border-primary">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="end" sideOffset={8}>
          {email ? (
            <>
              <DropdownMenuLabel className="max-w-[220px] truncate font-normal">
                {email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          ) : null}
          {ACCOUNT_MENU_ITEMS.map(item => {
            if (item.id === AccountMenuItemId.ApiDocs) {
              return (
                <DropdownMenuItem key={item.id} asChild className="cursor-pointer">
                  <Link href={item.href}>{item.label}</Link>
                </DropdownMenuItem>
              )
            }
            if (item.id === AccountMenuItemId.Settings) {
              return (
                <DropdownMenuItem
                  key={item.id}
                  className="cursor-pointer"
                  onSelect={() => setIsSettingsOpen(true)}
                >
                  {item.label}
                </DropdownMenuItem>
              )
            }
            return (
              <DropdownMenuItem
                key={item.id}
                className="cursor-pointer"
                onSelect={() => {
                  void handleLogout()
                }}
              >
                {item.label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        projectId={currentProject?.id}
      />
    </>
  )
}
