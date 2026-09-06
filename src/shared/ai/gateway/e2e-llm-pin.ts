import { AsyncLocalStorage } from 'node:async_hooks'
import { EnvVarName } from '@/shared/data/constants/protocol'
import { E2E_MOCK_USER_ID } from '@/shared/auth/constants/e2e-auth'
import {
  E2eBannedModelNeedle,
  E2eHarnessEmail,
  E2eOpenRouterGateway,
  E2ePinnedChatModel,
} from '@/shared/ai/gateway/constants/e2e-llm-pin'

const pinStore = new AsyncLocalStorage<true>()

export function withE2eLlmPin<T>(fn: () => T): T {
  return pinStore.run(true, fn)
}

export function isE2eLlmPinned(): boolean {
  return pinStore.getStore() === true
}

/** Request-scoped pin for Next handlers. Skipped under Vitest so judging tests stay unpinned. */
export function applyE2eLlmPinIfHarness(input: {
  userId?: string
  email?: string | null
  bypassHeader?: string | null
}): void {
  if (process.env.VITEST) return
  if (isE2eHarnessCaller(input)) {
    pinStore.enterWith(true)
  }
}

export function isE2eHarnessCaller(input: {
  userId?: string
  email?: string | null
  bypassHeader?: string | null
}): boolean {
  if (input.userId === E2E_MOCK_USER_ID) return true
  const email = input.email?.trim().toLowerCase() ?? ''
  if (email.startsWith(E2eHarnessEmail.Prefix) && email.endsWith(E2eHarnessEmail.Suffix)) {
    return true
  }
  const secret = process.env[EnvVarName.E2eBypassAuthSecret]
  return Boolean(secret && input.bypassHeader === secret)
}

export function isE2eBannedModelId(modelId: string): boolean {
  const normalized = modelId.trim().toLowerCase().replaceAll(':', '/')
  return (
    normalized.includes(E2eBannedModelNeedle.Gpt56Sol) ||
    normalized.includes(E2eBannedModelNeedle.KimiSlash) ||
    normalized.includes(E2eBannedModelNeedle.KimiK)
  )
}

/** When the e2e pin is active, Kimi and GPT-5.6 Sol become GLM. Otherwise the id is unchanged. */
export function remapModelIdIfE2ePinned(modelId: string, userId?: string): string {
  const pinned = isE2eLlmPinned() || (userId !== undefined && isE2eHarnessCaller({ userId }))
  if (!pinned || !isE2eBannedModelId(modelId)) return modelId
  const stripped = modelId.trim()
  if (stripped.startsWith(E2eOpenRouterGateway.Prefix)) return E2ePinnedChatModel.GatewayId
  if (stripped.includes(':') && !stripped.includes('/')) return E2ePinnedChatModel.CatalogId
  return E2ePinnedChatModel.OpenRouterId
}
