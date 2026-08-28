/**
 * Gate fixture — MUST fail `local/no-bare-process-env`.
 * Never imported by src/.
 */
// Expected error: local/no-bare-process-env
export function apiKey(): string | undefined {
  return process.env.SOME_PROVIDER_API_KEY
}

/** Exempt: Next inlines this only as a literal member expression. */
export const publicUrl = process.env.NEXT_PUBLIC_SITE_URL

/** Exempt: supplied by the runtime, not by configuration. */
export const isDev = process.env.NODE_ENV === 'development'

/** Exempt: a variable key cannot be named by a schema. */
export function byName(name: string): string | undefined {
  return process.env[name]
}

// Expected error: a quoted key is still a named variable
export const quoted = process.env['ANOTHER_PROVIDER_KEY']
