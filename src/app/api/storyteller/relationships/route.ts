/**
 * Storyteller Relationships API
 *
 * Builds a relationship graph from ALL available data sources:
 * 1. entity_references table (with Voyage embeddings for similarity)
 * 2. storyPlan factions (with members/rivals)
 * 3. characters table
 * 4. storyPlan.keyCharacters
 * 5. Text co-occurrence in worldDescription, plotTwists, faction descriptions
 *
 * Edge weights come from:
 * - Embedding cosine similarity (0-1, most accurate)
 * - Explicit membership/rivalry (0.8-0.9)
 * - Text co-occurrence (0.4-0.6)
 * - Fallback association (0.2-0.3)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects, characters, entityReferences } from '@/domains/storyteller/db/schema'
import { eq, sql } from 'drizzle-orm'
import { withAuth, type AuthenticatedRequest } from '@/lib/api-utils'

// =============================================================================
// TYPES
// =============================================================================

interface GraphNode {
  id: string
  name: string
  type: 'character' | 'faction' | 'place' | 'event' | 'rule'
  metadata: Record<string, unknown>
}

interface GraphEdge {
  source: string
  target: string
  weight: number
  type: string
  label?: string
}

interface RelationshipResponse {
  nodes: GraphNode[]
  edges: GraphEdge[]
  centralCharacter?: string
}

// =============================================================================
// HELPERS
// =============================================================================

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

function addNode(
  nodes: GraphNode[],
  nodeIds: Set<string>,
  id: string,
  name: string,
  type: GraphNode['type'],
  metadata: Record<string, unknown> = {}
) {
  if (nodeIds.has(id)) return
  nodeIds.add(id)
  nodes.push({ id, name, type, metadata })
}

function addEdge(
  edges: GraphEdge[],
  edgeIds: Set<string>,
  source: string,
  target: string,
  weight: number,
  type: string,
  label?: string
) {
  const key = [source, target].sort().join('|')
  if (edgeIds.has(key)) return
  edgeIds.add(key)
  edges.push({ source, target, weight, type, label })
}

// =============================================================================
// MAIN
// =============================================================================

export const GET = withAuth(async (request: NextRequest, _auth: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
    }

    // ─── 1. Gather ALL data sources in parallel ─────────────────────────
    const [project, dbCharacters, dbEntities] = await Promise.all([
      db.query.projects.findFirst({
        where: eq(projects.id, projectId),
        with: { storyPlanTable: true },
      }),
      db.select().from(characters).where(eq(characters.projectId, projectId)),
      db
        .select({
          id: entityReferences.id,
          name: entityReferences.name,
          type: entityReferences.type,
          description: entityReferences.description,
          metadata: entityReferences.metadata,
          hasEmbedding: sql<boolean>`${entityReferences.embedding} IS NOT NULL`,
        })
        .from(entityReferences)
        .where(eq(entityReferences.projectId, projectId)),
    ])

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const storyPlan = (project.storyPlanTable?.content as any) || (project.storyPlan as any) || {}
    const seriesBible = (project.seriesBible as any) || {}
    const factions = (storyPlan.factions || []) as any[]
    const keyCharacters = (storyPlan.keyCharacters ||
      storyPlan.cast ||
      seriesBible.keyCharacters ||
      []) as any[]
    const projectCast = ((project as any).cast || []) as any[]

    // ─── 2. Build nodes from every source (deduplicated) ────────────────
    const nodes: GraphNode[] = []
    const nodeIds = new Set<string>()

    // Source A: entity_references table (highest priority - has embeddings)
    // Deduplicate by name+type (keep the one with embedding, or first occurrence)
    const seenEntityNames = new Map<string, string>() // "type:name" -> id
    for (const entity of dbEntities) {
      const key = `${entity.type}:${entity.name.toLowerCase()}`
      if (seenEntityNames.has(key)) {
        // Skip duplicate - prefer one with embedding
        if (entity.hasEmbedding && !nodeIds.has(seenEntityNames.get(key)!)) {
          // This one has embedding, swap
          const oldId = seenEntityNames.get(key)!
          nodeIds.delete(oldId)
          const idx = nodes.findIndex(n => n.id === oldId)
          if (idx >= 0) nodes.splice(idx, 1)
        } else {
          continue // Skip duplicate
        }
      }
      seenEntityNames.set(key, entity.id)
      addNode(nodes, nodeIds, entity.id, entity.name, entity.type as GraphNode['type'], {
        ...((entity.metadata as any) || {}),
        description: entity.description,
        hasEmbedding: entity.hasEmbedding,
        source: 'entity_registry',
      })
    }

    // Source B: characters table
    for (const char of dbCharacters) {
      const id = `character-${slugify(char.name)}`
      addNode(nodes, nodeIds, id, char.name, 'character', {
        role: char.role,
        archetype: char.archetype,
        motivation: char.motivation,
        source: 'characters_table',
      })
    }

    // Source C: storyPlan.keyCharacters / cast
    for (const char of [...projectCast, ...keyCharacters]) {
      if (!char?.name) continue
      const id = `character-${slugify(char.name)}`
      addNode(nodes, nodeIds, id, char.name, 'character', {
        role: char.role || char.archetype,
        archetype: char.archetype,
        motivation: char.motivation || char.description,
        source: 'story_plan',
      })
    }

    // Source D: factions
    for (const faction of factions) {
      if (!faction?.name) continue
      const id = `faction-${slugify(faction.name)}`
      addNode(nodes, nodeIds, id, faction.name, 'faction', {
        ideology: faction.ideology,
        description: faction.description,
        powerStructure: faction.powerStructure,
        source: 'story_plan',
      })
    }

    // ─── 3. Build edges using multiple strategies ───────────────────────
    const edges: GraphEdge[] = []
    const edgeIds = new Set<string>()

    // Strategy 1: Embedding similarity (pgvector cosine distance)
    // This is the most accurate - uses Voyage AI semantic understanding
    const entitiesWithEmbeddings = dbEntities.filter(e => e.hasEmbedding)

    if (entitiesWithEmbeddings.length >= 2) {
      try {
        // Use raw SQL for pairwise similarity - much more efficient than N^2 API calls
        const pairwiseResult = await db.execute(sql`
          SELECT 
            a.id as source_id,
            b.id as target_id,
            a.name as source_name,
            b.name as target_name,
            a.type as source_type,
            b.type as target_type,
            1 - (a.embedding <=> b.embedding) as similarity
          FROM entity_references a
          CROSS JOIN entity_references b
          WHERE a.project_id = ${projectId}
            AND b.project_id = ${projectId}
            AND a.id < b.id
            AND a.embedding IS NOT NULL
            AND b.embedding IS NOT NULL
            AND 1 - (a.embedding <=> b.embedding) > 0.45
          ORDER BY similarity DESC
          LIMIT 50
        `)

        for (const row of (pairwiseResult.rows || pairwiseResult) as any[]) {
          const sourceType = row.source_type as string
          const targetType = row.target_type as string
          const similarity = parseFloat(row.similarity)

          // Infer meaningful relationship type and label from entity types + similarity
          let relType = 'associated'
          let label = ''

          if (sourceType === 'character' && targetType === 'faction') {
            relType = similarity > 0.6 ? 'member_of' : 'associated'
            label = similarity > 0.6 ? 'Affiliated' : 'Connected to'
          } else if (sourceType === 'faction' && targetType === 'character') {
            relType = similarity > 0.6 ? 'member_of' : 'associated'
            label = similarity > 0.6 ? 'Includes' : 'Connected to'
          } else if (sourceType === 'faction' && targetType === 'faction') {
            if (similarity > 0.75) {
              relType = 'ally'
              label = 'Allied'
            } else if (similarity > 0.6) {
              relType = 'rival'
              label = 'Competing'
            } else {
              relType = 'associated'
              label = 'Aware of'
            }
          } else if (sourceType === 'character' && targetType === 'character') {
            if (similarity > 0.75) {
              relType = 'ally'
              label = 'Close bond'
            } else if (similarity > 0.6) {
              relType = 'associated'
              label = 'Know each other'
            } else {
              relType = 'related'
              label = 'Acquainted'
            }
          } else if (sourceType === 'place' || targetType === 'place') {
            relType = 'associated'
            label = 'Located in'
          } else {
            label = 'Related'
          }

          addEdge(edges, edgeIds, row.source_id, row.target_id, similarity, relType, label)
        }

        console.log(`[Relationships] Embedding similarity: ${edges.length} edges`)
      } catch (err) {
        console.warn('[Relationships] Embedding similarity query failed:', err)
      }
    }

    // Strategy 2: Explicit faction membership and rivalries
    for (const faction of factions) {
      if (!faction?.name) continue
      const factionId = `faction-${slugify(faction.name)}`

      // Members
      const members = [...(faction.members || []), ...(faction.keyMembers || [])]
      for (const member of members) {
        const charId = `character-${slugify(member)}`
        if (nodeIds.has(charId)) {
          addEdge(edges, edgeIds, charId, factionId, 0.9, 'member_of', 'Member')
        }
      }

      // Rivals
      for (const rival of faction.rivals || []) {
        const rivalId = `faction-${slugify(rival)}`
        if (nodeIds.has(rivalId)) {
          addEdge(edges, edgeIds, factionId, rivalId, 0.8, 'rival', 'Rivals')
        }
      }
    }

    // Strategy 3: Text co-occurrence (world description, plot twists, faction descriptions)
    const allText = [
      storyPlan.worldDescription || '',
      ...(storyPlan.plotTwists || []).map(
        (pt: any) =>
          `${pt.title || ''} ${pt.description || ''} ${pt.impact || ''} ${pt.foreshadowing || ''}`
      ),
      ...factions.map(
        (f: any) =>
          `${f.name || ''} ${f.description || ''} ${f.powerStructure || ''} ${f.politicalForces || ''}`
      ),
    ]
      .join('\n')
      .toLowerCase()

    if (allText.length > 50) {
      // Split into paragraphs for locality
      const paragraphs = allText.split(/\n\n|\.\s+/).filter(p => p.length > 20)

      for (const paragraph of paragraphs) {
        const mentionedNodes = nodes.filter(n => paragraph.includes(n.name.toLowerCase()))

        // Entities mentioned in same paragraph are related
        for (let i = 0; i < mentionedNodes.length; i++) {
          for (let j = i + 1; j < mentionedNodes.length; j++) {
            const a = mentionedNodes[i]
            const b = mentionedNodes[j]

            let relType = 'associated'
            if (
              (a.type === 'character' && b.type === 'faction') ||
              (a.type === 'faction' && b.type === 'character')
            ) {
              relType = 'member_of'
            }

            addEdge(edges, edgeIds, a.id, b.id, 0.5, relType, 'Co-mentioned')
          }
        }
      }
    }

    // Strategy 4: If we have nodes but still no edges, create a fully connected graph
    // with weak associations (better than showing disconnected nodes)
    if (edges.length === 0 && nodes.length >= 2) {
      console.log('[Relationships] No edges from any strategy, creating full mesh')
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]
          const b = nodes[j]
          let relType = 'associated'
          if (
            (a.type === 'character' && b.type === 'faction') ||
            (a.type === 'faction' && b.type === 'character')
          ) {
            relType = 'member_of'
          }
          addEdge(edges, edgeIds, a.id, b.id, 0.25, relType)
        }
      }
    }

    // Filter edges to only reference existing nodes
    const validEdges = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))

    // ─── 4. Compute centrality ──────────────────────────────────────────
    const centrality = new Map<string, number>()
    for (const node of nodes) centrality.set(node.id, 0)
    for (const edge of validEdges) {
      centrality.set(edge.source, (centrality.get(edge.source) || 0) + edge.weight)
      centrality.set(edge.target, (centrality.get(edge.target) || 0) + edge.weight)
    }

    let centralCharacter: string | undefined
    let maxCentrality = 0
    for (const [id, score] of centrality) {
      if (score > maxCentrality) {
        maxCentrality = score
        centralCharacter = id
      }
    }

    console.log(
      `[Relationships] Final: ${nodes.length} nodes, ${validEdges.length} edges (${edges.length - validEdges.length} orphaned removed), central: ${centralCharacter || 'none'}`
    )

    return NextResponse.json({
      nodes,
      edges: validEdges,
      centralCharacter,
    } satisfies RelationshipResponse)
  } catch (error) {
    console.error('[Relationships API] Failed:', error)
    return NextResponse.json({ error: 'Failed to fetch relationships' }, { status: 500 })
  }
})
