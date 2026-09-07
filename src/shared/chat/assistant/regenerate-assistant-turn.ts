import { isAssistantTurnBusy } from './assistant-turn-phase'

export async function regenerateAssistantTurn(input: {
  isBusy: boolean
  stop: () => Promise<void> | void
  regenerate: () => Promise<void>
}): Promise<void> {
  if (input.isBusy) await input.stop()
  await input.regenerate()
}

export function canRegenerateAssistantTurn(status: string | undefined): boolean {
  return !isAssistantTurnBusy(status)
}
