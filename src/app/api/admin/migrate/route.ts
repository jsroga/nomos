import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/client'
import { sql } from 'drizzle-orm'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { withAuth, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { isAdminUser } from '@/shared/auth/admin-users'
import { HttpStatus } from '@/shared/data/constants/protocol'

export const POST = withAuth(async (_request: NextRequest, { session }: AuthenticatedRequest) => {
  // Running migrations is a platform operation, not a tenant one: 403 is correct
  // here because a role failure confirms nothing about anyone's data.
  if (!isAdminUser(session.user.email)) {
    return NextResponse.json({ error: API_ERROR.FORBIDDEN }, { status: HttpStatus.FORBIDDEN })
  }

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
      message: API_ERROR.MIGRATION_SUCCESS,
    })
  } catch (error: unknown) {
    console.error(API_LOG_PREFIX.MIGRATION_FAILED, error)
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 }
    )
  }
})
