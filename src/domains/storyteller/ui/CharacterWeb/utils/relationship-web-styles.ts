import { StorytellerRelationshipType } from '@/domains/storyteller/services/constants/relationship-enricher'

export type RelationshipType = `${StorytellerRelationshipType}`

export const RELATIONSHIP_TYPES: RelationshipType[] = [
  StorytellerRelationshipType.Ally,
  StorytellerRelationshipType.Enemy,
  StorytellerRelationshipType.Rival,
  StorytellerRelationshipType.Mentor,
  StorytellerRelationshipType.Student,
  StorytellerRelationshipType.Lover,
  StorytellerRelationshipType.Family,
  StorytellerRelationshipType.MemberOf,
  StorytellerRelationshipType.LeaderOf,
  StorytellerRelationshipType.Associated,
  StorytellerRelationshipType.Related,
  StorytellerRelationshipType.Owns,
  StorytellerRelationshipType.Uses,
  StorytellerRelationshipType.CausedBy,
  StorytellerRelationshipType.HappenedAt,
  StorytellerRelationshipType.LocatedIn,
  StorytellerRelationshipType.Temporal,
  StorytellerRelationshipType.Stranger,
  StorytellerRelationshipType.Acquaintance,
  StorytellerRelationshipType.Complex,
]

const RELATIONSHIP_TYPE_SET = new Set<string>(RELATIONSHIP_TYPES)

export const RELATIONSHIP_DEFAULT_TYPE = StorytellerRelationshipType.Related

export function parseRelationshipType(value: string | undefined): RelationshipType {
  if (value && RELATIONSHIP_TYPE_SET.has(value)) {
    for (const type of RELATIONSHIP_TYPES) {
      if (type === value) return type
    }
  }
  return RELATIONSHIP_DEFAULT_TYPE
}

export enum RelationshipStrokeStyle {
  Solid = 'solid',
  Dashed = 'dashed',
  Dotted = 'dotted',
}

export enum RelationshipEdgeColor {
  Ally = '#22c55e',
  Enemy = '#ef4444',
  Rival = '#f97316',
  Mentor = '#a855f7',
  Lover = '#ec4899',
  Family = '#3b82f6',
  FactionIndigo = '#6366f1',
  Associated = '#94a3b8',
  Related = '#64748b',
  Owns = '#f59e0b',
  Uses = '#eab308',
  CausedBy = '#f43f5e',
  PlaceGreen = '#10b981',
  Temporal = '#8b5cf6',
  Stranger = '#52525b',
  Acquaintance = '#71717a',
  Complex = '#fb923c',
}

export const RELATIONSHIP_STYLES: Record<
  RelationshipType,
  {
    color: string
    strokeStyle: string
    strokeWidth: number
    animated: boolean
  }
> = {
  [StorytellerRelationshipType.Ally]: {
    color: RelationshipEdgeColor.Ally,
    strokeStyle: RelationshipStrokeStyle.Solid,
    strokeWidth: 2,
    animated: false,
  },
  [StorytellerRelationshipType.Enemy]: {
    color: RelationshipEdgeColor.Enemy,
    strokeStyle: RelationshipStrokeStyle.Dashed,
    strokeWidth: 2,
    animated: true,
  },
  [StorytellerRelationshipType.Rival]: {
    color: RelationshipEdgeColor.Rival,
    strokeStyle: RelationshipStrokeStyle.Dotted,
    strokeWidth: 2,
    animated: false,
  },
  [StorytellerRelationshipType.Mentor]: {
    color: RelationshipEdgeColor.Mentor,
    strokeStyle: RelationshipStrokeStyle.Solid,
    strokeWidth: 3,
    animated: false,
  },
  [StorytellerRelationshipType.Student]: {
    color: RelationshipEdgeColor.Mentor,
    strokeStyle: RelationshipStrokeStyle.Solid,
    strokeWidth: 1,
    animated: false,
  },
  [StorytellerRelationshipType.Lover]: {
    color: RelationshipEdgeColor.Lover,
    strokeStyle: RelationshipStrokeStyle.Solid,
    strokeWidth: 3,
    animated: true,
  },
  [StorytellerRelationshipType.Family]: {
    color: RelationshipEdgeColor.Family,
    strokeStyle: RelationshipStrokeStyle.Solid,
    strokeWidth: 2,
    animated: false,
  },
  [StorytellerRelationshipType.MemberOf]: {
    color: RelationshipEdgeColor.FactionIndigo,
    strokeStyle: RelationshipStrokeStyle.Dashed,
    strokeWidth: 1,
    animated: false,
  },
  [StorytellerRelationshipType.LeaderOf]: {
    color: RelationshipEdgeColor.FactionIndigo,
    strokeStyle: RelationshipStrokeStyle.Solid,
    strokeWidth: 3,
    animated: false,
  },
  [StorytellerRelationshipType.Associated]: {
    color: RelationshipEdgeColor.Associated,
    strokeStyle: RelationshipStrokeStyle.Dotted,
    strokeWidth: 1,
    animated: false,
  },
  [StorytellerRelationshipType.Related]: {
    color: RelationshipEdgeColor.Related,
    strokeStyle: RelationshipStrokeStyle.Dotted,
    strokeWidth: 1,
    animated: false,
  },
  [StorytellerRelationshipType.Owns]: {
    color: RelationshipEdgeColor.Owns,
    strokeStyle: RelationshipStrokeStyle.Solid,
    strokeWidth: 1,
    animated: false,
  },
  [StorytellerRelationshipType.Uses]: {
    color: RelationshipEdgeColor.Uses,
    strokeStyle: RelationshipStrokeStyle.Dashed,
    strokeWidth: 1,
    animated: false,
  },
  [StorytellerRelationshipType.CausedBy]: {
    color: RelationshipEdgeColor.CausedBy,
    strokeStyle: RelationshipStrokeStyle.Dotted,
    strokeWidth: 1,
    animated: false,
  },
  [StorytellerRelationshipType.HappenedAt]: {
    color: RelationshipEdgeColor.PlaceGreen,
    strokeStyle: RelationshipStrokeStyle.Solid,
    strokeWidth: 1,
    animated: false,
  },
  [StorytellerRelationshipType.LocatedIn]: {
    color: RelationshipEdgeColor.PlaceGreen,
    strokeStyle: RelationshipStrokeStyle.Dashed,
    strokeWidth: 1,
    animated: false,
  },
  [StorytellerRelationshipType.Temporal]: {
    color: RelationshipEdgeColor.Temporal,
    strokeStyle: RelationshipStrokeStyle.Dotted,
    strokeWidth: 1,
    animated: false,
  },
  [StorytellerRelationshipType.Stranger]: {
    color: RelationshipEdgeColor.Stranger,
    strokeStyle: RelationshipStrokeStyle.Dotted,
    strokeWidth: 1,
    animated: false,
  },
  [StorytellerRelationshipType.Acquaintance]: {
    color: RelationshipEdgeColor.Acquaintance,
    strokeStyle: RelationshipStrokeStyle.Dotted,
    strokeWidth: 1,
    animated: false,
  },
  [StorytellerRelationshipType.Complex]: {
    color: RelationshipEdgeColor.Complex,
    strokeStyle: RelationshipStrokeStyle.Dashed,
    strokeWidth: 2,
    animated: true,
  },
}
