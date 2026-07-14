/** CharacterWeb graph UI wire values. */

import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'
import { GRAPH_NODE_TYPES } from '@/domains/storyteller/io/constants/relationships-api'
import {
  RELATIONSHIP_DEFAULT_TYPE,
  RelationshipStrokeStyle,
} from '@/domains/storyteller/ui/CharacterWeb/constants/relationship-web-styles'
import { StorytellerRelationshipType } from '@/domains/storyteller/services/constants/relationship-enricher'
import { RelationshipsApiError } from '@/domains/storyteller/io/constants/relationships-api'

export { GRAPH_NODE_TYPES as CHARACTER_WEB_LAYOUT_TYPES }
export { RELATIONSHIP_DEFAULT_TYPE as CHARACTER_WEB_DEFAULT_RELATIONSHIP }
export { RelationshipsApiError as CharacterWebApiError }

export enum CharacterWebNodeType {
  CharacterNode = 'characterNode',
}

export enum CharacterWebQueryParam {
  Node = 'node',
}

export enum CharacterWebEdgeStyle {
  LabelFill = '#94a3b8',
  LabelBgFill = '#18181b',
  DashedDasharray = '5,5',
  DottedDasharray = '2,2',
  OpacityTransition = 'opacity 0.3s ease',
}

export enum CharacterWebMinimapColor {
  Character = '#9333ea',
  Faction = '#3b82f6',
  Place = '#10b981',
  Event = '#f59e0b',
  Rule = '#f43f5e',
  Fallback = '#6b7280',
}

export enum CharacterWebSurfaceColor {
  Canvas = '#27272a',
  PanelBg = '#18181b',
  Mask = 'rgba(0,0,0,0.8)',
}

export enum CharacterWebLog {
  FocusedEntity = '[CharacterWeb] Focused on entity: ',
  FetchFailed = '[CharacterWeb] Failed to fetch:',
  PerfCompleted = '[CharacterWeb][perf] fetch+layout completed in ',
}

export enum CharacterWebUiCopy {
  Loading = 'Loading relationships...',
  LoadFailed = 'Failed to load relationships',
  EmptyTitle = 'No character relationships found.',
  EmptyHint = 'Add characters to the cast to see their web.',
  RefreshTitle = 'Refresh relationships',
}

export enum CharacterWebLegendLabel {
  Ally = 'Ally',
  Enemy = 'Enemy',
  Rival = 'Rival',
  Mentor = 'Mentor',
  Lover = 'Lover',
  Family = 'Family',
}

export const CHARACTER_WEB_DEFAULT_ENTITY_TYPE = StoryEntityType.Character

export const CHARACTER_WEB_STROKE_DASH_BY_STYLE: Record<string, string | undefined> = {
  [RelationshipStrokeStyle.Dashed]: CharacterWebEdgeStyle.DashedDasharray,
  [RelationshipStrokeStyle.Dotted]: CharacterWebEdgeStyle.DottedDasharray,
}

export const CHARACTER_WEB_LEGEND_ITEMS = [
  {
    type: StorytellerRelationshipType.Ally,
    label: CharacterWebLegendLabel.Ally,
  },
  {
    type: StorytellerRelationshipType.Enemy,
    label: CharacterWebLegendLabel.Enemy,
  },
  {
    type: StorytellerRelationshipType.Rival,
    label: CharacterWebLegendLabel.Rival,
  },
  {
    type: StorytellerRelationshipType.Mentor,
    label: CharacterWebLegendLabel.Mentor,
  },
  {
    type: StorytellerRelationshipType.Lover,
    label: CharacterWebLegendLabel.Lover,
  },
  {
    type: StorytellerRelationshipType.Family,
    label: CharacterWebLegendLabel.Family,
  },
] as const
