/** Committed Mastra Editor FilesystemStore directory (source: code). */

export enum MastraEditorCodePath {
  Relative = 'src/mastra/editor',
}

export enum EditorOverlayFile {
  PromptBlocks = 'prompt-blocks.json',
  Agents = 'agents.json',
  ScorerDefinitions = 'scorer-definitions.json',
  AgentsDir = 'agents',
}

export enum EditorOverlayField {
  Content = 'content',
  Name = 'name',
  Description = 'description',
  Tools = 'tools',
  Instructions = 'instructions',
}

export enum EditorOverlayJsonSuffix {
  Json = '.json',
}
