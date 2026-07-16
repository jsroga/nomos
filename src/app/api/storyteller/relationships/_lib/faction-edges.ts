import { GraphNodeIdPrefix, RelationshipEdgeLabel } from '@/domains/storyteller/core/io/constants/relationships-api'
import { StorytellerRelationshipType } from '@/domains/storyteller/services/constants/relationship-enricher'
import { readString, stringArrayFromJson } from '@/shared/data/json-guards'
import { addEdge, slugify, type GraphEdge } from './graph-types'

export function addFactionMembershipEdges(params: {
  factions: Record<string, unknown>[]
  nodeIds: Set<string>
  edges: GraphEdge[]
  edgeIds: Set<string>
}): void {
  for (const faction of params.factions) {
    const factionName = readString(faction.name)
    if (!factionName) continue
    const factionId = `${GraphNodeIdPrefix.Faction}${slugify(factionName)}`

    const members = [
      ...stringArrayFromJson(faction.members),
      ...stringArrayFromJson(faction.keyMembers),
    ]
    for (const member of members) {
      const charId = `${GraphNodeIdPrefix.Character}${slugify(member)}`
      if (params.nodeIds.has(charId)) {
        addEdge(
          params.edges,
          params.edgeIds,
          charId,
          factionId,
          0.9,
          StorytellerRelationshipType.MemberOf,
          RelationshipEdgeLabel.Member
        )
      }
    }

    for (const rival of stringArrayFromJson(faction.rivals)) {
      const rivalId = `${GraphNodeIdPrefix.Faction}${slugify(rival)}`
      if (params.nodeIds.has(rivalId)) {
        addEdge(
          params.edges,
          params.edgeIds,
          factionId,
          rivalId,
          0.8,
          StorytellerRelationshipType.Rival,
          RelationshipEdgeLabel.Rivals
        )
      }
    }
  }
}
