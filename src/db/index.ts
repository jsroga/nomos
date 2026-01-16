import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// For server-side usage (API routes, server components)
const connectionString = process.env.DATABASE_URL!

// Create postgres client with connection pooling configuration
const client = postgres(connectionString, {
  // Connection pool settings
  max: 20, // Maximum connections in pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds

  // Performance settings
  prepare: true, // Enable prepared statements for better performance

  // SSL for production
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,

  // Transform settings for type safety
  transform: {
    undefined: null, // Transform undefined to null
  },

  // Debug in development
  debug:
    process.env.NODE_ENV === 'development' && process.env.DEBUG_SQL === 'true'
      ? (connection, query, params) => {
          console.log('[SQL]', query.substring(0, 200))
        }
      : false,
})

// Create drizzle instance with schema
export const db = drizzle(client, { schema })

// Re-export schema and types
export * from './schema'
