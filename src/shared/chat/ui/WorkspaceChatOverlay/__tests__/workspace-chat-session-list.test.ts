import { describe, expect, it } from 'vitest'
import { AssistantChatRuntimeStatus } from '@/shared/chat/core/constants/assistant-runtime-status'
import { ChatSessionStatus } from '@/shared/chat/core/constants/chat-session'
import {
  WorkspaceChatCopy,
  WorkspaceChatRenameGlyph,
  workspaceChatRenameGlyph,
} from '../workspace-chat-copy'
import {
  isWorkspaceChatSessionBusy,
  shouldKeepHistoryMenuOpen,
  workspaceChatRenameButtonTitle,
} from '../workspace-chat-session-helpers'

describe('workspace chat rename glyph', () => {
  it('uses save while renaming and pencil otherwise', () => {
    expect(workspaceChatRenameGlyph(false)).toBe(WorkspaceChatRenameGlyph.Edit)
    expect(workspaceChatRenameGlyph(true)).toBe(WorkspaceChatRenameGlyph.Save)
    expect(
      workspaceChatRenameButtonTitle(
        WorkspaceChatRenameGlyph.Save,
        WorkspaceChatCopy.Save,
        WorkspaceChatCopy.Rename,
      ),
    ).toBe(WorkspaceChatCopy.Save)
    expect(
      workspaceChatRenameButtonTitle(
        WorkspaceChatRenameGlyph.Edit,
        WorkspaceChatCopy.Save,
        WorkspaceChatCopy.Rename,
      ),
    ).toBe(WorkspaceChatCopy.Rename)
  })
})

describe('workspace chat history menu', () => {
  it('stays open while a session is being renamed', () => {
    expect(shouldKeepHistoryMenuOpen(false, 'session-1')).toBe(true)
    expect(shouldKeepHistoryMenuOpen(false, null)).toBe(false)
    expect(shouldKeepHistoryMenuOpen(true, null)).toBe(true)
  })

  it('treats streaming host or local status as busy', () => {
    expect(isWorkspaceChatSessionBusy(ChatSessionStatus.Idle, AssistantChatRuntimeStatus.Ready)).toBe(
      false,
    )
    expect(
      isWorkspaceChatSessionBusy(ChatSessionStatus.Streaming, AssistantChatRuntimeStatus.Ready),
    ).toBe(true)
    expect(
      isWorkspaceChatSessionBusy(ChatSessionStatus.Idle, AssistantChatRuntimeStatus.Streaming),
    ).toBe(true)
  })
})
