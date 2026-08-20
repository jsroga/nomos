export enum ActionRequestField {
  Action = 'action',
  ProjectId = 'projectId',
  EpisodeId = 'episodeId',
  TraceId = 'traceId',
  Reasoning = 'reasoning',
}

export enum ActionWireField {
  Type = 'type',
  Payload = 'payload',
}

export enum BeatPayloadField {
  BeatId = 'beatId',
  Logline = 'logline',
  Content = 'content',
  Description = 'description',
  BeatType = 'beatType',
  VisualHook = 'visualHook',
  Updates = 'updates',
  NewIndex = 'newIndex',
}

export enum CharacterPayloadField {
  Name = 'name',
  Role = 'role',
  Description = 'description',
  CharacterId = 'characterId',
  Updates = 'updates',
}

export enum SyncCastFallbackName {
  Unknown = 'unknown',
}
