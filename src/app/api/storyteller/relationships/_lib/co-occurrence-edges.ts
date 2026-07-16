import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'
import { RelationshipEdgeLabel, RELATIONSHIP_EDGE_DEFAULT_TYPE } from '@/domains/storyteller/core/io/constants/relationships-api'
import { StorytellerRelationshipType } from '@/domains/storyteller/services/constants/relationship-enricher'
import { readString, recordArrayFromJson } from '@/shared/data/json-guards'
import { addEdge, type GraphEdge, type GraphNode } from './graph-types'

function collectStoryText(
  storyPlan: Record<string, unknown>,
  factions: Record<string, unknown>[]
): string {
  const plotTwistText = recordArrayFromJson(storyPlan.plotTwists).map(pt => {
    return [
      readString(pt.title),
      readString(pt.description),
      readString(pt.impact),
      readString(pt.foreshadowing),
    ]
      .filter(Boolean)
      .join(' ')
  })

  const factionText = factions.map(f => {
    return [
      readString(f.name),
      readString(f.description),
      readString(f.powerStructure),
      readString(f.politicalForces),
    ]
      .filter(Boolean)
      .join(' ')
  })

  return [
    readString(storyPlan.worldDescription) ?? '',
    ...plotTwistText,
    ...factionText,
  ]
    .join('\n')
    .toLowerCase()
}

function coOccurrenceRelationshipType(
  sourceType: StoryEntityType,
  targetType: StoryEntityType
): string {
  const isCharacterFactionPair =
    (sourceType === StoryEntityType.Character && targetType === StoryEntityType.Faction) ||
    (sourceType === StoryEntityType.Faction && targetType === StoryEntityType.Character)

  return isCharacterFactionPair
    ? StorytellerRelationshipType.MemberOf
    : RELATIONSHIP_EDGE_DEFAULT_TYPE
}

function addParagraphCoMentionEdges(params: {
  paragraph: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  edgeIds: Set<string>
}): void {
  const mentionedNodes = params.nodes.filter(n => params.paragraph.includes(n.name.toLowerCase()))

  for (let i = 0; i < mentionedNodes.length; i++) {
    for (let j = i + 1; j < mentionedNodes.length; j++) {
      const a = mentionedNodes[i]
      const b = mentionedNodes[j]
      const relType = coOccurrenceRelationshipType(a.type, b.type)
      addEdge(params.edges, params.edgeIds, a.id, b.id, 0.5, relType, RelationshipEdgeLabel.CoMentioned)
    }
  }
}

export function addTextCoOccurrenceEdges(params: {
  storyPlan: Record<string, unknown>
  factions: Record<string, unknown>[]
  nodes: GraphNode[]
  edges: GraphEdge[]
  edgeIds: Set<string>
}): void {
  const allText = collectStoryText(params.storyPlan, params.factions)
  if (allText.length <= 50) return

  const paragraphs = allText.split(/\n\n|\.\s+/).filter(p => p.length > 20)
  for (const paragraph of paragraphs) {
    addParagraphCoMentionEdges({
      paragraph,
      nodes: params.nodes,
      edges: params.edges,
      edgeIds: params.edgeIds,
    })
  }
}
