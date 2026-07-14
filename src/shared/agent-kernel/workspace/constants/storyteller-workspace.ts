/** Storyteller workspace artifact types, directories, and file wire values. */

export enum StorytellerArtifactType {
  Script = 'script',
  Outline = 'outline',
  BeatBoard = 'beat-board',
  CharacterSheet = 'character-sheet',
  WorldBible = 'world-bible',
}

export enum StorytellerWorkspaceDir {
  Scripts = 'scripts',
  WorldBible = 'world-bible',
  Episodes = 'episodes',
  Characters = 'characters',
  Outlines = 'outlines',
}

export enum StorytellerWorkspaceDefault {
  BasePath = './workspace/storyteller',
}

export enum StorytellerWorkspaceFileExt {
  Json = '.json',
}

export const STORYTELLER_WORKSPACE_AUTO_INDEX_DIRS = [
  StorytellerWorkspaceDir.Scripts,
  StorytellerWorkspaceDir.WorldBible,
  StorytellerWorkspaceDir.Episodes,
] as const

export const STORYTELLER_WORKSPACE_ALL_DIRS = [
  StorytellerWorkspaceDir.Scripts,
  StorytellerWorkspaceDir.WorldBible,
  StorytellerWorkspaceDir.Episodes,
  StorytellerWorkspaceDir.Characters,
  StorytellerWorkspaceDir.Outlines,
] as const

export type StorytellerArtifactTypeValue = `${StorytellerArtifactType}`
