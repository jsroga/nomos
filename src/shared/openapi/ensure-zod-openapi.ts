import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

let extended = false

/** Call once before registering paths — safe to invoke repeatedly. */
export function ensureZodOpenApi(): typeof z {
  if (!extended) {
    extendZodWithOpenApi(z)
    extended = true
  }
  return z
}
