/** Audience psychographic profiles for audience analyzer. */

import { AUDIENCE_PROFILES_CORE } from './audience-analyzer-profiles-core'
import { AUDIENCE_PROFILES_EXTENDED } from './audience-analyzer-profiles-extended'

export type { AudienceProfile } from './audience-analyzer-types'

export const AUDIENCE_PROFILES = [
  ...AUDIENCE_PROFILES_CORE,
  ...AUDIENCE_PROFILES_EXTENDED,
]
