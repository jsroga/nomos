export enum WorkspaceChatCopy {
  ToggleAria = 'Workspace chat',
  PanelAria = 'Workspace chat panel',
  NewChat = 'New chat',
  History = 'Chat history',
  HistoryEmpty = 'No chats yet',
  StreamingSuffix = ' ·',
  Rename = 'Rename',
  Save = 'Save',
  Delete = 'Delete',
  DeleteTitle = 'Delete this chat?',
  DeleteDescription = 'This removes the session. Generation for this chat stops.',
  NoAgentTitle = 'This page has no chat agent',
  NoAgentDescription = 'Watching and Stop still work. This module has no chat agent.',
  MismatchTitle = 'This thread belongs to another module',
  MismatchDescription = 'Start a new chat for this page to send. The current thread keeps running.',
  MismatchConfirm = 'Start a new chat',
  Ok = 'OK',
  ComposerDisabled = 'Chat is unavailable on this page',
}

export enum WorkspaceChatClass {
  Panel = 'relative z-[60] ml-auto flex h-full w-96 shrink-0 flex-col border-l-0 bg-card/95',
  PanelHidden = 'relative z-[60] ml-auto flex h-full w-96 shrink-0 flex-col border-l-0 bg-card/95 hidden',
  SessionBar = 'flex h-[50px] shrink-0 items-center gap-2 border-b border-border px-3',
  SessionBarNew = 'h-9 flex-1',
  SessionBarHistory = 'h-9 w-9 shrink-0 px-0',
  HistoryItem = 'flex items-center gap-1',
  HistoryItemSelected = 'flex items-center gap-1 bg-muted',
}

export enum WorkspaceChatRenameGlyph {
  Edit = 'edit',
  Save = 'save',
}

export function workspaceChatRenameGlyph(isRenaming: boolean): WorkspaceChatRenameGlyph {
  return isRenaming ? WorkspaceChatRenameGlyph.Save : WorkspaceChatRenameGlyph.Edit
}
