/**
 * Union of inventory + honor identities for the committed baseline snapshot.
 */

import { inventory } from './index.mjs'
import { honorIdentities } from './honor.mjs'
import {
  classifyProcessEnvRead,
  classifyProviderSdkImport,
  classifyTriggerTaskShape,
  classifyUntypedJsonRead,
} from './matchers.mjs'

export function collectIdentities() {
  const identities = [
    ...inventory(classifyUntypedJsonRead).identities,
    ...inventory(classifyProcessEnvRead).identities,
    ...inventory(classifyProviderSdkImport).identities,
    ...inventory(classifyTriggerTaskShape).identities,
    ...honorIdentities(),
  ]
  return [...new Set(identities)].sort()
}
