import { env } from '@/shared/config/env'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '@/db/schema'
import {
  postgresSsl,
  stripPostgresSslQueryParams,
} from '@/shared/persistence/postgres-ssl'

const connectionString = stripPostgresSslQueryParams(env.DATABASE_URL ?? '')

const pool = new Pool({
  connectionString,
  ssl: postgresSsl(),
  max: 20, // Increased for concurrent streams
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
})

export const db = drizzle(pool, { schema })
