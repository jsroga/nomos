import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'
import { StorytellerQueryParam } from '@/domains/storyteller/core/storyteller-page-wire'
import { StorytellerRelationshipType } from '@/domains/storyteller/services/constants/relationship-enricher'

export enum RelationshipsQueryParam {
  ProjectId = StorytellerQueryParam.ProjectId,
  Refresh = 'refresh',
}

export enum RelationshipsQueryValue {
  RefreshTrue = 'true',
}

export enum GraphNodeSource {
  EntityRegistry = 'entity_registry',
  CharactersTable = 'characters_table',
  StoryPlan = 'story_plan',
}

export enum GraphNodeIdPrefix {
  Character = 'character-',
  Faction = 'faction-',
}

export enum RelationshipsApiError {
  MissingProjectId = 'Missing projectId',
  ProjectNotFound = 'Project not found',
  FetchFailed = 'Failed to fetch relationships',
}

export enum RelationshipsApiLog {
  DbCacheReadFailed = '[Relationships] DB cache read failed, continuing with live extraction:',
  EmbeddingSimilarityFailed = '[Relationships] Embedding similarity query failed:',
  NoEdgesFound = '[Relationships] No edges found — story may not have documented relationships yet',
  ApiFailed = '[Relationships API] Failed:',
}

export enum EmbeddingSimilaritySqlColumn {
  SourceType = 'source_type',
  TargetType = 'target_type',
  Similarity = 'similarity',
  SourceId = 'source_id',
  TargetId = 'target_id',
}

export enum RelationshipEdgeLabel {
  Connected = 'Connected',
  Affiliated = 'Affiliated',
  LocatedIn = 'Located in',
  Member = 'Member',
  Rivals = 'Rivals',
  CoMentioned = 'Co-mentioned',
}

export const RELATIONSHIP_EDGE_DEFAULT_TYPE = StorytellerRelationshipType.Associated

export const GRAPH_NODE_TYPES: StoryEntityType[] = [
  StoryEntityType.Character,
  StoryEntityType.Faction,
  StoryEntityType.Place,
  StoryEntityType.Event,
  StoryEntityType.Rule,
]

export const RELATIONSHIPS_CENTRAL_CHARACTER_NONE = 'none'
