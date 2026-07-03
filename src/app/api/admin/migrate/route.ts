import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/client'
import { sql } from 'drizzle-orm'
import { withAuth, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { getErrorMessage } from '@/shared/errors/error-utils'

export const POST = withAuth(async (_request: NextRequest, { session }: AuthenticatedRequest) => {
  try {
    // Enable pgvector extension
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`)

    // Create entity_references table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS entity_references (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        metadata JSONB DEFAULT '{}',
        project_id UUID NOT NULL,
        source_entity_id UUID,
        embedding vector(1536),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        last_referenced_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `)

    // Create indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_entity_references_project 
      ON entity_references(project_id)
    `)

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_entity_references_type 
      ON entity_references(type)
    `)

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_entity_references_embedding 
      ON entity_references USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
    `)

    return NextResponse.json({
      success: true,
      message: 'entity_references table created successfully',
    })
  } catch (error: unknown) {
    console.error('Migration failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 }
    )
  }
})
