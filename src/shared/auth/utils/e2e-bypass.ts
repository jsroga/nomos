import {
  AuthBypassFlag,
  EnvVarName,
  HttpHeader,
  NodeEnv,
} from '@/shared/data/constants/protocol'

export function isE2eBypassRuntime(): boolean {
  const nodeEnv = process.env.NODE_ENV
  if (nodeEnv === NodeEnv.Development || nodeEnv === NodeEnv.Test) return true
  return process.env[EnvVarName.E2eAllowProdBypass] === AuthBypassFlag.True
}

export function isE2eBypassRequest(request: {
  headers: { get(name: string): string | null }
}): boolean {
  const secret = process.env[EnvVarName.E2eBypassAuthSecret]
  if (!secret || !isE2eBypassRuntime()) return false
  return request.headers.get(HttpHeader.BYPASS_AUTH) === secret
}
