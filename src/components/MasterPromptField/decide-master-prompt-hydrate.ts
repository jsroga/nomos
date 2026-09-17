export enum MasterPromptHydrateAction {
  ApplyServer = 'apply-server',
  KeepLocal = 'keep-local',
  PersistLocal = 'persist-local',
  Synced = 'synced',
}

export function decideMasterPromptHydrate(input: {
  hydrateKey: string
  lastHydrateKey: string | null
  serverPrompt: string
  localPrompt: string
  dirty: boolean
  lastSent: string
}): MasterPromptHydrateAction {
  if (input.lastHydrateKey !== input.hydrateKey) {
    return MasterPromptHydrateAction.ApplyServer
  }
  if (input.serverPrompt === input.localPrompt) {
    return MasterPromptHydrateAction.Synced
  }
  if (!input.dirty) return MasterPromptHydrateAction.ApplyServer
  if (input.localPrompt !== input.lastSent) {
    return MasterPromptHydrateAction.PersistLocal
  }
  return MasterPromptHydrateAction.KeepLocal
}
