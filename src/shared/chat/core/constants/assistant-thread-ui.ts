/** Assistant thread UI copy and entity-card colouring. */

export enum ChatEntityKind {
  Character = 'character',
  Location = 'location',
  Faction = 'faction',
  Item = 'item',
  Quest = 'quest',
}

export enum ChatMessageRole {
  Assistant = 'assistant',
  User = 'user',
}

export enum ChatPartType {
  Text = 'text',
  Reasoning = 'reasoning',
  StepStart = 'step-start',
  StepFinish = 'step-finish',
}

export enum ChatToolPartPrefix {
  Tool = 'tool-',
}

export enum ChatMessageStatus {
  Running = 'running',
}

export enum AssistantReasoningPrefix {
  Activity = '▸ ',
}

export const CHAT_ENTITY_KIND_STYLE: Record<
  ChatEntityKind,
  { fill: string; border: string; foreground: string }
> = {
  [ChatEntityKind.Character]: {
    fill: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.28)',
    foreground: 'rgb(147, 197, 253)',
  },
  [ChatEntityKind.Location]: {
    fill: 'rgba(34, 197, 94, 0.12)',
    border: 'rgba(34, 197, 94, 0.28)',
    foreground: 'rgb(134, 239, 172)',
  },
  [ChatEntityKind.Faction]: {
    fill: 'rgba(168, 85, 247, 0.12)',
    border: 'rgba(168, 85, 247, 0.28)',
    foreground: 'rgb(192, 132, 252)',
  },
  [ChatEntityKind.Item]: {
    fill: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.28)',
    foreground: 'rgb(252, 211, 77)',
  },
  [ChatEntityKind.Quest]: {
    fill: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.28)',
    foreground: 'rgb(252, 211, 77)',
  },
}

export const ASSISTANT_THREAD_COPY = {
  EmptyHint: 'Start a conversation.',
  InputPlaceholder: 'Ask anything about your world…',
  KeyboardHint: 'Enter to send · Shift+Enter for a new line',
  Thinking: 'Thinking',
  ReasoningLive: 'Thinking…',
  ReasoningDone: 'Thought process',
  Connecting: 'Connecting',
  Writing: 'Writing',
  AddToWorld: 'Add to world',
  AddedToWorld: 'Added',
  SectionLabelJoin: ', ',
  ModelFallback: 'Auto',
  AddToWorldPromptPrefix: 'Add these to the world bible:\n',
  ShowDetails: 'Details',
  ShowDetailsAria: 'Show tool and JSON details',
  HideDetailsAria: 'Hide tool and JSON details',
  ShowLogs: 'Logs',
  ShowLogsAria: 'Show orchestrator logs',
  HideLogsAria: 'Hide orchestrator logs',
  Regenerate: 'Regenerate',
} as const

export const ASSISTANT_THREAD_WIRE = {
  MentionAt: '@',
  MentionAtSpace: '@ ',
  CssHeightAuto: 'auto',
} as const

/** Keys forwarded on assistant-ui → `/api/assistant/*` request bodies. */
export enum AssistantChatBodyKey {
  ModelName = 'modelName',
  ProjectId = 'projectId',
  EpisodeId = 'episodeId',
  BibleSection = 'bibleSection',
  Messages = 'messages',
  SessionId = 'sessionId',
}

export type AssistantChatModelOption = {
  id: string
  label: string
}

export type ParsedChatEntity = {
  name: string
  description: string
  kind: ChatEntityKind
}

export enum AssistantFollowUpChip {
  ExpandPrefix = 'Expand ',
  DraftCreed = 'Draft their creed',
  MapDistricts = 'Map the districts',
  WhatStartsWar = 'What starts the war?',
  GoDeeper = 'Go deeper',
  Alternatives = 'Give me alternatives',
}

