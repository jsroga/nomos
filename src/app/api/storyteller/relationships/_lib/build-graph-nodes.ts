import { entityMetadata } from '@/domains/storyteller/core/entities/entity-type-guards'
import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'
import { GraphNodeIdPrefix, GraphNodeSource } from '@/domains/storyteller/core/io/constants/relationships-api'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import type { DbEntityRow, ProjectGraphContext } from './fetch-project-data'
import {
  addNode,
  parseGraphNodeType,
  slugify,
  type GraphNode,
} from './graph-types'

export interface GraphNodeBuildResult {
  nodes: GraphNode[]
  nodeIds: Set<string>
  canonicalNodeId: (id: string) => string
}

function addEntityRegistryNodes(
  nodes: GraphNode[],
  nodeIds: Set<string>,
  dbEntities: DbEntityRow[]
) {
  const seenEntityNames = new Map<string, string>()

  for (const entity of dbEntities) {
    const key = `${entity.type}:${entity.name.toLowerCase()}`
    const duplicateId = seenEntityNames.get(key)
    if (duplicateId !== undefined) {
      if (entity.hasEmbedding && !nodeIds.has(duplicateId)) {
        nodeIds.delete(duplicateId)
        const idx = nodes.findIndex(n => n.id === duplicateId)
        if (idx >= 0) nodes.splice(idx, 1)
      } else {
        continue
      }
    }
    seenEntityNames.set(key, entity.id)
    const nodeType = parseGraphNodeType(entity.type) ?? StoryEntityType.Character
    addNode(nodes, nodeIds, entity.id, entity.name, nodeType, {
      ...entityMetadata(entity.metadata),
      description: entity.description,
      hasEmbedding: entity.hasEmbedding,
      source: GraphNodeSource.EntityRegistry,
    })
  }
}

function addCharacterTableNodes(
  nodes: GraphNode[],
  nodeIds: Set<string>,
  dbCharacters: ProjectGraphContext['dbCharacters']
) {
  for (const char of dbCharacters) {
    const id = `${GraphNodeIdPrefix.Character}${slugify(char.name)}`
    const charRecord = recordFromJson(char)
    addNode(nodes, nodeIds, id, char.name, StoryEntityType.Character, {
      role: char.role,
      motivation: readString(charRecord.motivation),
      source: GraphNodeSource.CharactersTable,
    })
  }
}

function addStoryPlanCharacterNodes(
  nodes: GraphNode[],
  nodeIds: Set<string>,
  castEntries: Array<Record<string, unknown> & { name: string }>
) {
  for (const char of castEntries) {
    const id = `${GraphNodeIdPrefix.Character}${slugify(char.name)}`
    addNode(nodes, nodeIds, id, char.name, StoryEntityType.Character, {
      role: readString(char.role) ?? readString(char.archetype),
      archetype: readString(char.archetype),
      motivation: readString(char.motivation) ?? readString(char.description),
      source: GraphNodeSource.StoryPlan,
    })
  }
}

function addFactionNodes(
  nodes: GraphNode[],
  nodeIds: Set<string>,
  factions: Record<string, unknown>[]
) {
  for (const faction of factions) {
    const name = readString(faction.name)
    if (!name) continue
    const id = `${GraphNodeIdPrefix.Faction}${slugify(name)}`
    addNode(nodes, nodeIds, id, name, StoryEntityType.Faction, {
      ideology: readString(faction.ideology),
      description: readString(faction.description),
      powerStructure: readString(faction.powerStructure),
      source: GraphNodeSource.StoryPlan,
    })
  }
}

function mergeDuplicateSlugNodes(nodes: GraphNode[], nodeIds: Set<string>): Map<string, string> {
  const canonicalMap = new Map<string, string>()

  for (const node of nodes) {
    if (node.id.startsWith(GraphNodeIdPrefix.Character) || node.id.startsWith(GraphNodeIdPrefix.Faction)) {
      continue
    }

    const slugId = `${node.type}-${slugify(node.name)}`
    if (nodeIds.has(slugId) && slugId !== node.id) {
      canonicalMap.set(slugId, node.id)
      const idx = nodes.findIndex(n => n.id === slugId)
      if (idx >= 0) nodes.splice(idx, 1)
      nodeIds.delete(slugId)
      console.log(`[Relationships] Merged duplicate node: ${slugId} → ${node.id}`)
    }
  }

  return canonicalMap
}

export function buildGraphNodes(
  context: Pick<
    ProjectGraphContext,
    'dbEntities' | 'dbCharacters' | 'projectCast' | 'keyCharacters' | 'factions'
  >
): GraphNodeBuildResult {
  const nodes: GraphNode[] = []
  const nodeIds = new Set<string>()

  addEntityRegistryNodes(nodes, nodeIds, context.dbEntities)
  addCharacterTableNodes(nodes, nodeIds, context.dbCharacters)
  addStoryPlanCharacterNodes(nodes, nodeIds, [...context.projectCast, ...context.keyCharacters])
  addFactionNodes(nodes, nodeIds, context.factions)

  const canonicalMap = mergeDuplicateSlugNodes(nodes, nodeIds)
  const canonicalNodeId = (id: string) => canonicalMap.get(id) ?? id

  return { nodes, nodeIds, canonicalNodeId }
}
