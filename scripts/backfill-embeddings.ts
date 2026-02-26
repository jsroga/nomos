/**
 * Backfill embeddings for all existing entities
 * Run with: source .env.local && npx tsx scripts/backfill-embeddings.ts
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'

async function backfillEmbeddings() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not found')
  }
  if (!process.env.VOYAGE_API_KEY) {
    throw new Error('VOYAGE_API_KEY not found')
  }

  const client = postgres(process.env.DATABASE_URL, { max: 1 })
  const db = drizzle(client)

  console.log('🧠 Backfilling embeddings for existing entities...\n')

  try {
    // 1. Get all entities without embeddings
    const entities = await db.execute(sql`
      SELECT id, type, name, description, metadata 
      FROM entity_references 
      WHERE embedding IS NULL
      ORDER BY created_at DESC
    `)

    const rows = entities.rows || entities || []
    console.log(`Found ${rows.length} entities without embeddings\n`)

    if (rows.length === 0) {
      console.log('✅ All entities already have embeddings!')
      return
    }

    // 2. Use Voyage API directly
    const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
    const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY!
    const VOYAGE_MODEL = 'voyage-3' // 1024 dimensions
    
    async function getEmbeddings(texts: string[]): Promise<number[][]> {
      const response = await fetch(VOYAGE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${VOYAGE_API_KEY}`,
        },
        body: JSON.stringify({
          model: VOYAGE_MODEL,
          input: texts,
          input_type: 'document',
          truncation: true,
        }),
      })
      
      if (!response.ok) {
        throw new Error(`Voyage API error: ${response.status} ${await response.text()}`)
      }
      
      const data = await response.json()
      return data.data.sort((a: any, b: any) => a.index - b.index).map((d: any) => d.embedding)
    }

    let success = 0
    let failed = 0

    // 3. Process in batches of 10
    const batchSize = 10
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize)
      
      const texts = batch.map((entity: any) => {
        const meta = entity.metadata || {}
        const parts = [
          `${entity.type}: ${entity.name}`,
          entity.description || '',
        ]
        
        // Add metadata fields
        if (meta.role) parts.push(`Role: ${meta.role}`)
        if (meta.archetype) parts.push(`Archetype: ${meta.archetype}`)
        if (meta.motivation) parts.push(`Motivation: ${meta.motivation}`)
        if (meta.ideology) parts.push(`Ideology: ${meta.ideology}`)
        if (meta.description && meta.description !== entity.description) {
          parts.push(meta.description)
        }
        if (meta.powerStructure) parts.push(meta.powerStructure)
        if (meta.politicalForces) parts.push(meta.politicalForces)
        if (meta.goals && Array.isArray(meta.goals)) {
          parts.push(`Goals: ${meta.goals.join(', ')}`)
        }
        if (meta.fatalFlaw) parts.push(`Fatal flaw: ${meta.fatalFlaw}`)
        
        return parts.filter(Boolean).join('. ')
      })

      try {
        const embeddings = await getEmbeddings(texts)
        
        // Update each entity
        for (let j = 0; j < batch.length; j++) {
          const entity = batch[j] as any
          const embedding = embeddings[j]
          
          if (embedding && embedding.length > 0) {
            // Format as pgvector string: [0.1, 0.2, ...]
            const vectorStr = `[${embedding.join(',')}]`
            await db.execute(sql`
              UPDATE entity_references 
              SET embedding = ${vectorStr}::vector,
                  last_referenced_at = NOW()
              WHERE id = ${entity.id}
            `)
            console.log(`  ✅ ${entity.type}: ${entity.name}`)
            success++
          } else {
            console.log(`  ⚠️ ${entity.type}: ${entity.name} - wrong dimension (${embedding?.length})`)
            failed++
          }
        }
      } catch (err) {
        console.error(`  ❌ Batch ${i}-${i + batchSize} failed:`, err)
        failed += batch.length
      }

      // Rate limit: 100ms between batches
      if (i + batchSize < rows.length) {
        await new Promise(r => setTimeout(r, 100))
      }
    }

    console.log(`\n✨ Done! ${success} embeddings generated, ${failed} failed`)
  } finally {
    await client.end()
  }
}

backfillEmbeddings()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal:', err)
    process.exit(1)
  })
