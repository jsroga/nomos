/** Overlay chat session vocabulary — host rows, not message bodies. */

export enum ChatSessionStatus {
  Idle = 'idle',
  Streaming = 'streaming',
  Suspended = 'suspended',
}

export enum ChatSessionWire {
  AiSdk = 'aiSdk',
}

export enum ChatSessionCopy {
  PlaceholderTitle = 'New chat',
}

export enum ChatSessionBodyKey {
  ProjectId = 'projectId',
  ModuleId = 'moduleId',
  Title = 'title',
  Status = 'status',
  RunId = 'runId',
}

export enum ChatSessionColumn {
  Id = 'id',
  ProjectId = 'project_id',
  UserId = 'user_id',
  ModuleId = 'module_id',
  Thread = 'thread',
  Resource = 'resource',
  Title = 'title',
  TitleLocked = 'title_locked',
  Status = 'status',
  RunId = 'run_id',
  Wire = 'wire',
  CreatedAt = 'created_at',
  UpdatedAt = 'updated_at',
}

export enum ChatSessionsApiPath {
  Root = '/api/chat/sessions',
}

export enum ChatSessionsApiSegment {
  Messages = 'messages',
}

export enum ChatSessionsApiHeader {
  ContentType = 'Content-Type',
}

export enum ChatSessionSendDecision {
  Ok = 'ok',
  ModuleMismatch = 'module-mismatch',
  ModuleHasNoAgent = 'module-has-no-agent',
}

export enum ChatSessionTitleLimit {
  MaxChars = 200,
  MaxWords = 6,
}

export enum ChatSessionTitleCopy {
  System = 'Title this chat in 6 words or fewer. No quotes.',
}
