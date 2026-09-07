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
  SessionBar = 'flex h-[50px] shrink-0 items-center gap-2 border-b border-border px-[22px]',
  SessionBarNew = 'h-8 leading-none inline-flex items-center justify-center flex-1 gap-[7px] px-3 py-1.5 rounded-lg shadow-[inset_0_0_0_1px_hsl(var(--border)/0.8)] text-[12.5px] text-foreground/85 transition-all duration-150 ease-in-out hover:bg-transparent hover:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.6)] hover:text-primary disabled:pointer-events-none disabled:opacity-50',
  SessionBarHistory = 'h-8 w-8 p-0 leading-none inline-flex items-center justify-center shrink-0 rounded-lg shadow-[inset_0_0_0_1px_hsl(var(--border)/0.8)] text-[12.5px] text-foreground/85 transition-all duration-150 ease-in-out hover:bg-transparent hover:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.6)] hover:text-primary',
  HistoryMenu = 'w-80 p-1',
  HistoryEmpty = 'px-2 py-1 text-[12.5px] text-muted-foreground',
  HistoryItem = 'flex items-center gap-0.5 px-1.5 py-0.5',
  HistoryItemSelected = 'bg-muted',
  HistoryItemTitle = 'min-w-0 flex-1 truncate px-1 text-left text-[12.5px] leading-tight',
  HistoryItemInput = 'h-7 px-2 py-0 text-[12.5px]',
  HistoryItemAction = 'h-6 w-6 shrink-0 p-0',
}

export enum WorkspaceChatRenameGlyph {
  Edit = 'edit',
  Save = 'save',
}

export function workspaceChatRenameGlyph(isRenaming: boolean): WorkspaceChatRenameGlyph {
  return isRenaming ? WorkspaceChatRenameGlyph.Save : WorkspaceChatRenameGlyph.Edit
}
