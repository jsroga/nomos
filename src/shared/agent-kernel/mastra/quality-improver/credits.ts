import { isPlainObject } from '../../../data/json-guards'
import { OpenRouterCreditNeedle } from './constants'

export enum CreditHaltKind {
  Insufficient = 'insufficient',
  InFlight = 'in-flight',
  None = 'none',
}

export function classifyOpenRouterCreditError(error: unknown): CreditHaltKind {
  const text = error instanceof Error ? `${error.message} ${error.stack ?? ''}` : String(error)
  if (text.includes(OpenRouterCreditNeedle.InFlight)) return CreditHaltKind.InFlight
  if (
    text.includes(OpenRouterCreditNeedle.Insufficient) ||
    text.includes(OpenRouterCreditNeedle.Status402)
  ) {
    return CreditHaltKind.Insufficient
  }
  if (isPlainObject(error) && error.status === 402) {
    return CreditHaltKind.Insufficient
  }
  return CreditHaltKind.None
}

export function sleepMs(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
