export enum VectorStringError {
  InvalidStringFormat = 'toVectorString: invalid string format',
  ExpectedArray = 'toVectorString: expected array',
  EmptyEmbedding = 'toVectorString: empty embedding',
}

/** Inferred edge labels from embedding similarity + entity-type pairing. */
export enum InferredRelationshipType {
  CloselyConnected = 'closely_connected',
  Associated = 'associated',
  Related = 'related',
  AlliedOrRival = 'allied_or_rival',
  MemberOf = 'member_of',
  HasMember = 'has_member',
  AssociatedWith = 'associated_with',
  InvolvedIn = 'involved_in',
  Uses = 'uses',
  Owns = 'owns',
  Controls = 'controls',
  Involves = 'involves',
  OccurredAt = 'occurred_at',
  CausedBy = 'caused_by',
  Temporal = 'temporal',
  LocatedIn = 'located_in',
  HappenedAt = 'happened_at',
}
