import { env } from '@/shared/config/env'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '@/db/schema'
import { NodeEnv } from '@/shared/data/constants/protocol'

const connectionString = env.DATABASE_URL ?? ''

// TLS is on everywhere except local development. It was previously off
// unconditionally ("SSL disabled for Supabase pooler"), which left the
// production connection unencrypted. Verify against the pooler in staging
// before relying on this in production.
const isDevelopment = process.env.NODE_ENV === NodeEnv.Development

const pool = new Pool({
  connectionString,
  ssl: isDevelopment ? false : { rejectUnauthorized: true },
  max: 20, // Increased for concurrent streams
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
})

export const db = drizzle(pool, { schema })
