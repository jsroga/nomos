'use client'

import { Pencil, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/Button'
import { ButtonSizeKey, ButtonVariantKey } from '@/components/Button/constants/button-styles'
import { DropdownMenuItem } from '@/components/DropdownMenu'
import { Input } from '@/components/Input'
import { HtmlElementType, KeyboardKey } from '@/shared/data/constants/protocol'
import type { ChatSession } from '@/shared/chat/core/io/chat-session-contract'
import {
  WorkspaceChatClass,
  WorkspaceChatCopy,
  WorkspaceChatRenameGlyph,
  workspaceChatRenameGlyph,
} from './workspace-chat-copy'
import { workspaceChatRenameButtonTitle } from './workspace-chat-session-helpers'

export function WorkspaceChatHistoryItem({
  session,
  selected,
  running,
  renaming,
  renameValue,
  onRenameValueChange,
  onCommitRename,
  onStartRename,
  onFocusSession,
  onDelete,
}: {
  session: ChatSession
  selected: boolean
  running: boolean
  renaming: boolean
  renameValue: string
  onRenameValueChange: (value: string) => void
  onCommitRename: () => void
  onStartRename: () => void
  onFocusSession: () => void
  onDelete: () => void
}) {
  const glyph = workspaceChatRenameGlyph(renaming)
  return (
    <DropdownMenuItem
      onSelect={event => event.preventDefault()}
      className={selected ? WorkspaceChatClass.HistoryItemSelected : WorkspaceChatClass.HistoryItem}
    >
      {renaming ? (
        <Input
          value={renameValue}
          onChange={event => onRenameValueChange(event.target.value)}
          onBlur={() => onCommitRename()}
          onKeyDown={event => {
            if (event.key === KeyboardKey.Enter) onCommitRename()
          }}
        />
      ) : (
        <button
          type={HtmlElementType.Button}
          className="min-w-0 flex-1 truncate px-1 text-left text-sm"
          onClick={onFocusSession}
        >
          {session.title}
          {running ? WorkspaceChatCopy.StreamingSuffix : ''}
        </button>
      )}
      <Button
        type={HtmlElementType.Button}
        size={ButtonSizeKey.Icon}
        variant={ButtonVariantKey.Ghost}
        title={workspaceChatRenameButtonTitle(glyph, WorkspaceChatCopy.Save, WorkspaceChatCopy.Rename)}
        onMouseDown={event => {
          event.preventDefault()
          if (!renaming) onStartRename()
        }}
        onClick={() => {
          if (renaming) onCommitRename()
        }}
      >
        {glyph === WorkspaceChatRenameGlyph.Save ? (
          <Save className="h-3.5 w-3.5" />
        ) : (
          <Pencil className="h-3.5 w-3.5" />
        )}
      </Button>
      <Button
        type={HtmlElementType.Button}
        size={ButtonSizeKey.Icon}
        variant={ButtonVariantKey.Ghost}
        title={WorkspaceChatCopy.Delete}
        onClick={onDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </DropdownMenuItem>
  )
}
