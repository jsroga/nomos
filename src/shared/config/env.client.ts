/**
 * The `NEXT_PUBLIC_*` values, and the reason they are written out one by one.
 *
 * Next substitutes these at build time **only** where the source contains the
 * literal member expression `process.env.NEXT_PUBLIC_X`. Reading them through
 * a loop, a variable key, or a helper defeats the substitution and ships
 * `undefined` to the browser — so this file cannot be tidied into a map, and
 * `local/no-bare-process-env` exempts this prefix for the same reason.
 *
 * Client-side, so no validation: a missing value is `undefined` here and the
 * caller decides. Server configuration is validated in `./env`.
 */
export const clientEnv = {
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  vercelUrl: process.env.NEXT_PUBLIC_VERCEL_URL,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  blobReadWriteToken: process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN,
  centralUsers: process.env.NEXT_PUBLIC_CENTRAL_USERS,
  defaultAgentModel: process.env.NEXT_PUBLIC_DEFAULT_AGENT_MODEL,
} as const
