/**
 * Create entity_references table
 * Run with: npx tsx scripts/create-entity-table.ts
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'

async function createEntityReferencesTable() {
  console.log('Creating entity_references table...')
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not found in environment')
  }
  
  const client = postgres(process.env.DATABASE_URL, { max: 1 })
  const db = drizzle(client)
  
  try {
    // Enable pgvector extension
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`)
    console.log('✅ pgvector extension enabled')
    
    // Create entity_references table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS entity_references (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        metadata JSONB DEFAULT '{}',
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        source_entity_id UUID,
        embedding vector(1536),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        last_referenced_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `)
    console.log('✅ entity_references table created')
    
    // Create indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_entity_references_project 
      ON entity_references(project_id);
    `)
    console.log('✅ Project index created')
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_entity_references_type 
      ON entity_references(type);
    `)
    console.log('✅ Type index created')
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_entity_references_embedding 
      ON entity_references USING ivfflat (embedding vector_cosine_ops) 
      WITH (lists = 100);
    `)
    console.log('✅ Embedding index created')
    
    console.log('✨ Migration complete!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await client.end()
  }
}

createEntityReferencesTable()
  .then(() => {
    console.log('✅ Done')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
