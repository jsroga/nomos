import { z } from 'zod'
import {
  createInteriorDesignRequestSchema,
  deleteInteriorDesignResponseSchema,
  interiorDesignDetailSchema,
  interiorDesignerJobStatusSchema,
  interiorDesignSummarySchema,
  interiorDesignSummaryListSchema,
  retextureRequestSchema,
  retextureStartResponseSchema,
  surfaceMaterialRequestSchema,
  surfaceMaterialStartResponseSchema,
  textTo3DRequestSchema,
  textTo3DStartResponseSchema,
  textureGenerationRequestSchema,
  textureGenerationResponseSchema,
  updateInteriorDesignRequestSchema,
} from './interior-designer.dto'

async function parseResponse<TSchema extends z.ZodTypeAny>(
  response: Response,
  schema: TSchema
): Promise<z.infer<TSchema>> {
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return schema.parse(data)
}

export const interiorDesignerApi = {
  async listDesigns(projectId: string) {
    const response = await fetch(
      `/api/interior-designer/designs?projectId=${encodeURIComponent(projectId)}`
    )
    return parseResponse(response, interiorDesignSummaryListSchema)
  },

  async getDesign(designId: string) {
    const response = await fetch(
      `/api/interior-designer/designs?designId=${encodeURIComponent(designId)}`
    )
    return parseResponse(response, interiorDesignDetailSchema)
  },

  async createDesign(input: z.input<typeof createInteriorDesignRequestSchema>) {
    const payload = createInteriorDesignRequestSchema.parse(input)
    const response = await fetch('/api/interior-designer/designs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return parseResponse(response, interiorDesignSummarySchema)
  },

  async updateDesign(input: z.input<typeof updateInteriorDesignRequestSchema>) {
    const payload = updateInteriorDesignRequestSchema.parse(input)
    const response = await fetch('/api/interior-designer/designs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return parseResponse(response, interiorDesignSummarySchema)
  },

  async deleteDesign(designId: string) {
    const response = await fetch(
      `/api/interior-designer/designs?id=${encodeURIComponent(designId)}`,
      { method: 'DELETE' }
    )
    return parseResponse(response, deleteInteriorDesignResponseSchema)
  },

  async generateTexture(input: z.input<typeof textureGenerationRequestSchema>) {
    const payload = textureGenerationRequestSchema.parse(input)
    const response = await fetch('/api/interior-designer/texture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return parseResponse(response, textureGenerationResponseSchema)
  },

  async startSurfaceMaterial(input: z.input<typeof surfaceMaterialRequestSchema>) {
    const payload = surfaceMaterialRequestSchema.parse(input)
    const response = await fetch('/api/interior-designer/material', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return parseResponse(response, surfaceMaterialStartResponseSchema)
  },

  async getSurfaceMaterialRun(taskId: string) {
    const response = await fetch(
      `/api/interior-designer/material/${encodeURIComponent(taskId)}`
    )
    return parseResponse(response, interiorDesignerJobStatusSchema)
  },

  async startRetexture(input: z.input<typeof retextureRequestSchema>) {
    const payload = retextureRequestSchema.parse(input)
    const response = await fetch('/api/interior-designer/retexture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return parseResponse(response, retextureStartResponseSchema)
  },

  async getRetextureRun(runId: string) {
    const response = await fetch(
      `/api/interior-designer/retexture/${encodeURIComponent(runId)}`
    )
    return parseResponse(response, interiorDesignerJobStatusSchema)
  },

  async startTextTo3D(input: z.input<typeof textTo3DRequestSchema>) {
    const payload = textTo3DRequestSchema.parse(input)
    const response = await fetch('/api/interior-designer/text-to-3d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return parseResponse(response, textTo3DStartResponseSchema)
  },

  async getTextTo3DRun(taskId: string) {
    const response = await fetch(
      `/api/interior-designer/text-to-3d/${encodeURIComponent(taskId)}`
    )
    return parseResponse(response, interiorDesignerJobStatusSchema)
  },
}
