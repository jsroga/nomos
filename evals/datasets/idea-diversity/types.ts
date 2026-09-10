/** Idea-diversity fixture generators — the "different agents/models" stand-ins. */

export enum IdeaAgentId {
  DiverseBrainstormer = 'diverse-brainstormer',
  RepetitiveEcho = 'repetitive-echo',
  TemplateFiller = 'template-filler',
  SeededSampler = 'seeded-sampler',
}

export enum IdeaModelId {
  FixtureDiverse = 'fixture/diverse-v1',
  FixtureCheap = 'fixture/cheap-v1',
  FixtureTemplate = 'fixture/template-v1',
  FixtureSeeded = 'fixture/seeded-v1',
}

export interface IdeaGeneratorSpec {
  agentId: IdeaAgentId
  modelId: IdeaModelId
  label: string
}

export interface IdeaSet {
  agentId: IdeaAgentId
  modelId: IdeaModelId
  label: string
  prompt: string
  ideas: string[]
}
