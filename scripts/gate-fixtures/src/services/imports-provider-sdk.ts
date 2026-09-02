/**
 * Gate fixture — MUST fail `no-restricted-imports`.
 * Reaching a provider SDK outside the gateway means the call is unmetered.
 * Never imported by src/.
 */
// Expected error: no-restricted-imports
import { generateText } from 'ai'

export const call = generateText
