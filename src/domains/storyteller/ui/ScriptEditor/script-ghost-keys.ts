export enum ScriptGhostIdleMs {
  Pause = 800,
}

export enum ScriptGhostKey {
  Tab = 'Tab',
  Escape = 'Escape',
}

export enum ScriptGhostKeyAction {
  Accept = 'accept',
  Dismiss = 'dismiss',
  Ignore = 'ignore',
}

export function scriptGhostKeyAction(key: string, ghostActive: boolean): ScriptGhostKeyAction {
  if (!ghostActive) return ScriptGhostKeyAction.Ignore
  if (key === ScriptGhostKey.Tab) return ScriptGhostKeyAction.Accept
  if (key === ScriptGhostKey.Escape) return ScriptGhostKeyAction.Dismiss
  return ScriptGhostKeyAction.Ignore
}
