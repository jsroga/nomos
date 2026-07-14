import { InferredRelationshipType } from '@/domains/storyteller/services/constants/entity-graph-wire'

export enum RelationshipEnricherLog {
  FailedToEnrichEntity = '[RelationshipEnricher] Failed to enrich entity:',
}

export enum StorytellerRelationshipType {
  Ally = 'ally',
  Enemy = 'enemy',
  Rival = 'rival',
  Mentor = 'mentor',
  Student = 'student',
  Lover = 'lover',
  Family = 'family',
  Stranger = 'stranger',
  Acquaintance = 'acquaintance',
  Complex = 'complex',
  MemberOf = 'member_of',
  LeaderOf = 'leader_of',
  Associated = 'associated',
  Related = 'related',
  Owns = 'owns',
  Uses = 'uses',
  CausedBy = 'caused_by',
  HappenedAt = 'happened_at',
  LocatedIn = 'located_in',
  Temporal = 'temporal',
}

export enum RelationshipSummaryLabel {
  AllyOf = 'Ally of',
  EnemyOf = 'Enemy of',
  RivalOf = 'Rival of',
  MentorTo = 'Mentor to',
  StudentOf = 'Student of',
  LoverOf = 'Lover of',
  FamilyOf = 'Family of',
  StrangerTo = 'Stranger to',
  AcquaintanceOf = 'Acquaintance of',
  ComplexRelationshipWith = 'Complex relationship with',
  MemberOf = 'Member of',
  LeaderOf = 'Leader of',
  AssociatedWith = 'Associated with',
  RelatedTo = 'Related to',
  Owns = 'Owns',
  Uses = 'Uses',
  CausedBy = 'Caused by',
  HappenedAt = 'Happened at',
  LocatedIn = 'Located in',
  TemporallyLinkedTo = 'Temporally linked to',
}

export const RELATIONSHIP_SUMMARY_LABELS: Record<
  StorytellerRelationshipType,
  RelationshipSummaryLabel
> = {
  [StorytellerRelationshipType.Ally]: RelationshipSummaryLabel.AllyOf,
  [StorytellerRelationshipType.Enemy]: RelationshipSummaryLabel.EnemyOf,
  [StorytellerRelationshipType.Rival]: RelationshipSummaryLabel.RivalOf,
  [StorytellerRelationshipType.Mentor]: RelationshipSummaryLabel.MentorTo,
  [StorytellerRelationshipType.Student]: RelationshipSummaryLabel.StudentOf,
  [StorytellerRelationshipType.Lover]: RelationshipSummaryLabel.LoverOf,
  [StorytellerRelationshipType.Family]: RelationshipSummaryLabel.FamilyOf,
  [StorytellerRelationshipType.Stranger]: RelationshipSummaryLabel.StrangerTo,
  [StorytellerRelationshipType.Acquaintance]: RelationshipSummaryLabel.AcquaintanceOf,
  [StorytellerRelationshipType.Complex]: RelationshipSummaryLabel.ComplexRelationshipWith,
  [StorytellerRelationshipType.MemberOf]: RelationshipSummaryLabel.MemberOf,
  [StorytellerRelationshipType.LeaderOf]: RelationshipSummaryLabel.LeaderOf,
  [StorytellerRelationshipType.Associated]: RelationshipSummaryLabel.AssociatedWith,
  [StorytellerRelationshipType.Related]: RelationshipSummaryLabel.RelatedTo,
  [StorytellerRelationshipType.Owns]: RelationshipSummaryLabel.Owns,
  [StorytellerRelationshipType.Uses]: RelationshipSummaryLabel.Uses,
  [StorytellerRelationshipType.CausedBy]: RelationshipSummaryLabel.CausedBy,
  [StorytellerRelationshipType.HappenedAt]: RelationshipSummaryLabel.HappenedAt,
  [StorytellerRelationshipType.LocatedIn]: RelationshipSummaryLabel.LocatedIn,
  [StorytellerRelationshipType.Temporal]: RelationshipSummaryLabel.TemporallyLinkedTo,
}

export const INFERRED_RELATIONSHIP_MAP: Record<
  InferredRelationshipType,
  StorytellerRelationshipType
> = {
  [InferredRelationshipType.CloselyConnected]: StorytellerRelationshipType.Ally,
  [InferredRelationshipType.Associated]: StorytellerRelationshipType.Associated,
  [InferredRelationshipType.Related]: StorytellerRelationshipType.Related,
  [InferredRelationshipType.AlliedOrRival]: StorytellerRelationshipType.Rival,
  [InferredRelationshipType.MemberOf]: StorytellerRelationshipType.MemberOf,
  [InferredRelationshipType.HasMember]: StorytellerRelationshipType.LeaderOf,
  [InferredRelationshipType.AssociatedWith]: StorytellerRelationshipType.Associated,
  [InferredRelationshipType.InvolvedIn]: StorytellerRelationshipType.Associated,
  [InferredRelationshipType.Controls]: StorytellerRelationshipType.LeaderOf,
  [InferredRelationshipType.Involves]: StorytellerRelationshipType.Associated,
  [InferredRelationshipType.OccurredAt]: StorytellerRelationshipType.Associated,
  [InferredRelationshipType.Uses]: StorytellerRelationshipType.Uses,
  [InferredRelationshipType.Owns]: StorytellerRelationshipType.Owns,
  [InferredRelationshipType.CausedBy]: StorytellerRelationshipType.CausedBy,
  [InferredRelationshipType.HappenedAt]: StorytellerRelationshipType.HappenedAt,
  [InferredRelationshipType.LocatedIn]: StorytellerRelationshipType.LocatedIn,
  [InferredRelationshipType.Temporal]: StorytellerRelationshipType.Temporal,
}
