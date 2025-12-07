import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// For server-side usage (API routes, server components)
const connectionString = process.env.DATABASE_URL!

// Create postgres client
const client = postgres(connectionString)

// Create drizzle instance with schema
export const db = drizzle(client, { schema })

// Re-export schema and types
export * from './schema'
