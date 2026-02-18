import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../domains/storyteller/db/schema'

const connectionString = process.env.DATABASE_URL!

// SSL disabled for Supabase pooler
const pool = new Pool({
  connectionString,
  ssl: false,
  max: 20, // Increased for concurrent streams
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

export const db = drizzle(pool, { schema })
