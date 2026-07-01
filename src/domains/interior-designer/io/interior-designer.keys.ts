export const interiorDesignerKeys = {
  all: ['interior-designer'] as const,
  designs: () => [...interiorDesignerKeys.all, 'designs'] as const,
  projectDesigns: (projectId: string) =>
    [...interiorDesignerKeys.designs(), 'project', projectId] as const,
  designDetail: (designId: string) => [...interiorDesignerKeys.designs(), 'detail', designId] as const,
  jobs: () => [...interiorDesignerKeys.all, 'jobs'] as const,
  materialJob: (taskId: string) => [...interiorDesignerKeys.jobs(), 'material', taskId] as const,
  retextureJob: (runId: string) => [...interiorDesignerKeys.jobs(), 'retexture', runId] as const,
  textTo3DJob: (taskId: string) => [...interiorDesignerKeys.jobs(), 'text-to-3d', taskId] as const,
} as const
