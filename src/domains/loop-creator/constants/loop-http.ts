/** HTTP methods used by loop-creator client IO. */

import { HttpMethod } from '@/shared/data/constants/protocol'

export const LoopHttpMethod = {
  Post: HttpMethod.Post,
  Patch: HttpMethod.Patch,
  Delete: HttpMethod.Delete,
} as const

export type LoopHttpMethod = (typeof LoopHttpMethod)[keyof typeof LoopHttpMethod]
