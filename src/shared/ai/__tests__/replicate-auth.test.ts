import { describe, expect, it } from 'vitest'
import { EnvVarName } from '@/shared/data/constants/protocol'
import { ReplicateTokenPrefix } from '@/shared/ai/constants/replicate-client'
import { readReplicateApiToken, resolveReplicateApiToken } from '../replicate-auth'

const ENV_TOKEN = `${ReplicateTokenPrefix.Official}envtoken`
const PAYLOAD_TOKEN = `${ReplicateTokenPrefix.Official}payloadtoken`

describe('resolveReplicateApiToken', () => {
  it('prefers the env token over a payload key', () => {
    const source = { [EnvVarName.ReplicateApiToken]: ` ${ENV_TOKEN} ` }
    expect(resolveReplicateApiToken(PAYLOAD_TOKEN, source)).toBe(ENV_TOKEN)
  })

  it('accepts a payload Replicate token when env is empty', () => {
    const source = { [EnvVarName.ReplicateApiToken]: '  ' }
    expect(resolveReplicateApiToken(` ${PAYLOAD_TOKEN} `, source)).toBe(PAYLOAD_TOKEN)
  })

  it('ignores a non-Replicate payload key', () => {
    const source = { [EnvVarName.ReplicateApiToken]: '' }
    expect(resolveReplicateApiToken('afk_not-replicate', source)).toBeUndefined()
    expect(readReplicateApiToken(source)).toBeUndefined()
  })
})
