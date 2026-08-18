import { EnvVarName } from '@/shared/data/constants/protocol'
import { ReplicateTokenPrefix } from '@/shared/ai/constants/replicate-client'

function trimmedEnv(
  source: Record<string, string | undefined>,
  name: string,
): string | undefined {
  const trimmed = source[name]?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : undefined
}

export function readReplicateApiToken(
  source: Record<string, string | undefined> = process.env,
): string | undefined {
  return trimmedEnv(source, EnvVarName.ReplicateApiToken)
}

export function resolveReplicateApiToken(
  payloadKey?: string | null,
  source: Record<string, string | undefined> = process.env,
): string | undefined {
  const fromEnv = readReplicateApiToken(source)
  if (fromEnv) return fromEnv
  const trimmed = payloadKey?.trim() ?? ''
  if (trimmed.startsWith(ReplicateTokenPrefix.Official)) return trimmed
  return undefined
}
