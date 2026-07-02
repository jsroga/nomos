export const interiorDesignerKeys = {
  all: ['interior-designer'] as const,

  designs: () => [...interiorDesignerKeys.all, 'designs'] as const,
  designList: (projectId: string) => [...interiorDesignerKeys.designs(), 'list', projectId] as const,
  design: (designId: string) => [...interiorDesignerKeys.designs(), 'detail', designId] as const,

  textures: () => [...interiorDesignerKeys.all, 'textures'] as const,
  textureGeneration: (prompt: string) => [...interiorDesignerKeys.textures(), 'generate', prompt] as const,

  retexture: (runId: string) => [...interiorDesignerKeys.all, 'retexture', runId] as const,
  textTo3D: (taskId: string) => [...interiorDesignerKeys.all, 'text-to-3d', taskId] as const,
  material: (taskId: string) => [...interiorDesignerKeys.all, 'material', taskId] as const,
}
