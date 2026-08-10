import { InteriorQueryKey } from './constants/query-keys'

export const interiorDesignerKeys = {
  all: [InteriorQueryKey.Root] as const,

  designs: () => [...interiorDesignerKeys.all, InteriorQueryKey.Designs] as const,
  designList: (projectId: string) =>
    [...interiorDesignerKeys.designs(), InteriorQueryKey.List, projectId] as const,
  design: (designId: string) =>
    [...interiorDesignerKeys.designs(), InteriorQueryKey.Detail, designId] as const,

  textures: () => [...interiorDesignerKeys.all, InteriorQueryKey.Textures] as const,
  textureGeneration: (prompt: string) =>
    [...interiorDesignerKeys.textures(), InteriorQueryKey.Generate, prompt] as const,

  retexture: (runId: string) =>
    [...interiorDesignerKeys.all, InteriorQueryKey.Retexture, runId] as const,
  textTo3D: (taskId: string) =>
    [...interiorDesignerKeys.all, InteriorQueryKey.TextTo3D, taskId] as const,
  material: (taskId: string) =>
    [...interiorDesignerKeys.all, InteriorQueryKey.Material, taskId] as const,
}
