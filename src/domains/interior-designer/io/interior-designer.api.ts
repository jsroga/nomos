import { z } from 'zod'
import { ContentType, HttpMethod } from '@/shared/data/constants/protocol'
import { INTERIOR_DESIGNER_API_BASE_PATH } from '../interior-designer.config'
import {
  createInteriorDesignRequestSchema,
  deleteInteriorDesignQuerySchema,
  deleteInteriorDesignResponseSchema,
  interiorDesignListResponseSchema,
  interiorDesignLookupQuerySchema,
  interiorDesignResponseSchema,
  interiorMaterialRequestSchema,
  interiorMaterialResponseSchema,
  interiorMaterialStatusResponseSchema,
  interiorRetextureRequestSchema,
  interiorRetextureResponseSchema,
  interiorRetextureStatusResponseSchema,
  interiorTextTo3DRequestSchema,
  interiorTextTo3DResponseSchema,
  interiorTextTo3DStatusResponseSchema,
  interiorTextureRequestSchema,
  interiorTextureResponseSchema,
  interiorTexturesRequestSchema,
  interiorTexturesResponseSchema,
  updateInteriorDesignRequestSchema,
  type CreateInteriorDesignRequest,
  type InteriorDesign,
  type InteriorMaterialRequest,
  type InteriorMaterialResponse,
  type InteriorMaterialStatusResponse,
  type InteriorRetextureRequest,
  type InteriorRetextureResponse,
  type InteriorRetextureStatusResponse,
  type InteriorTextTo3DRequest,
  type InteriorTextTo3DResponse,
  type InteriorTextTo3DStatusResponse,
  type InteriorTextureRequest,
  type InteriorTextureResponse,
  type InteriorTexturesRequest,
  type InteriorTexturesResponse,
  type UpdateInteriorDesignRequest,
} from './interior-designer.dto'

const apiErrorSchema = z.object({
  error: z.string(),
})

function buildUrl(path: string, query?: Record<string, string | undefined>): string {
  if (!query) {
    return path
  }

  const searchParams = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value)
    }
  })

  const queryString = searchParams.toString()
  return queryString ? `${path}?${queryString}` : path
}

async function parseResponse<TSchema extends z.ZodTypeAny>(
  response: Response,
  schema: TSchema
): Promise<z.output<TSchema>> {
  const json = await response.json().catch(() => null)

  if (!response.ok) {
    const parsedError = apiErrorSchema.safeParse(json)
    throw new Error(
      parsedError.success ? parsedError.data.error : `Request failed with status ${response.status}`
    )
  }

  return schema.parse(json)
}

export const interiorDesignerApi = {
  designs: {
    list: async ({ projectId }: { projectId: string }): Promise<InteriorDesign[]> => {
      const parsed = interiorDesignLookupQuerySchema.parse({ projectId })

      return parseResponse(
        await fetch(
          buildUrl(`${INTERIOR_DESIGNER_API_BASE_PATH}/designs`, {
            projectId: parsed.projectId,
          })
        ),
        interiorDesignListResponseSchema
      )
    },

    get: async ({ designId }: { designId: string }): Promise<InteriorDesign | null> => {
      const parsed = interiorDesignLookupQuerySchema.parse({ designId })

      return parseResponse(
        await fetch(
          buildUrl(`${INTERIOR_DESIGNER_API_BASE_PATH}/designs`, {
            designId: parsed.designId,
          })
        ),
        interiorDesignResponseSchema
      )
    },

    create: async (input: CreateInteriorDesignRequest): Promise<InteriorDesign | null> => {
      const parsed = createInteriorDesignRequestSchema.parse(input)

      return parseResponse(
        await fetch(`${INTERIOR_DESIGNER_API_BASE_PATH}/designs`, {
          method: HttpMethod.Post,
          headers: { 'Content-Type': ContentType.Json },
          body: JSON.stringify(parsed),
        }),
        interiorDesignResponseSchema
      )
    },

    update: async (input: UpdateInteriorDesignRequest): Promise<InteriorDesign | null> => {
      const parsed = updateInteriorDesignRequestSchema.parse(input)

      return parseResponse(
        await fetch(`${INTERIOR_DESIGNER_API_BASE_PATH}/designs`, {
          method: HttpMethod.Patch,
          headers: { 'Content-Type': ContentType.Json },
          body: JSON.stringify(parsed),
        }),
        interiorDesignResponseSchema
      )
    },

    delete: async ({ id }: { id: string }) => {
      const parsed = deleteInteriorDesignQuerySchema.parse({ id })

      return parseResponse(
        await fetch(
          buildUrl(`${INTERIOR_DESIGNER_API_BASE_PATH}/designs`, {
            id: parsed.id,
          }),
          {
            method: HttpMethod.Delete,
          }
        ),
        deleteInteriorDesignResponseSchema
      )
    },
  },

  texture: {
    generate: async (input: InteriorTextureRequest): Promise<InteriorTextureResponse> => {
      const parsed = interiorTextureRequestSchema.parse(input)

      return parseResponse(
        await fetch(`${INTERIOR_DESIGNER_API_BASE_PATH}/texture`, {
          method: HttpMethod.Post,
          headers: { 'Content-Type': ContentType.Json },
          body: JSON.stringify(parsed),
        }),
        interiorTextureResponseSchema
      )
    },
  },

  textures: {
    generate: async (input: InteriorTexturesRequest): Promise<InteriorTexturesResponse> => {
      const parsed = interiorTexturesRequestSchema.parse(input)

      return parseResponse(
        await fetch(`${INTERIOR_DESIGNER_API_BASE_PATH}/textures`, {
          method: HttpMethod.Post,
          headers: { 'Content-Type': ContentType.Json },
          body: JSON.stringify(parsed),
        }),
        interiorTexturesResponseSchema
      )
    },
  },

  retexture: {
    start: async (input: InteriorRetextureRequest): Promise<InteriorRetextureResponse> => {
      const parsed = interiorRetextureRequestSchema.parse(input)

      return parseResponse(
        await fetch(`${INTERIOR_DESIGNER_API_BASE_PATH}/retexture`, {
          method: HttpMethod.Post,
          headers: { 'Content-Type': ContentType.Json },
          body: JSON.stringify(parsed),
        }),
        interiorRetextureResponseSchema
      )
    },

    getStatus: async (runId: string): Promise<InteriorRetextureStatusResponse> =>
      parseResponse(
        await fetch(`${INTERIOR_DESIGNER_API_BASE_PATH}/retexture/${runId}`),
        interiorRetextureStatusResponseSchema
      ),
  },

  textTo3D: {
    start: async (input: InteriorTextTo3DRequest): Promise<InteriorTextTo3DResponse> => {
      const parsed = interiorTextTo3DRequestSchema.parse(input)

      return parseResponse(
        await fetch(`${INTERIOR_DESIGNER_API_BASE_PATH}/text-to-3d`, {
          method: HttpMethod.Post,
          headers: { 'Content-Type': ContentType.Json },
          body: JSON.stringify(parsed),
        }),
        interiorTextTo3DResponseSchema
      )
    },

    getStatus: async (taskId: string): Promise<InteriorTextTo3DStatusResponse> =>
      parseResponse(
        await fetch(`${INTERIOR_DESIGNER_API_BASE_PATH}/text-to-3d/${taskId}`),
        interiorTextTo3DStatusResponseSchema
      ),
  },

  material: {
    start: async (input: InteriorMaterialRequest): Promise<InteriorMaterialResponse> => {
      const parsed = interiorMaterialRequestSchema.parse(input)

      return parseResponse(
        await fetch(`${INTERIOR_DESIGNER_API_BASE_PATH}/material`, {
          method: HttpMethod.Post,
          headers: { 'Content-Type': ContentType.Json },
          body: JSON.stringify(parsed),
        }),
        interiorMaterialResponseSchema
      )
    },

    getStatus: async (taskId: string): Promise<InteriorMaterialStatusResponse> =>
      parseResponse(
        await fetch(`${INTERIOR_DESIGNER_API_BASE_PATH}/material/${taskId}`),
        interiorMaterialStatusResponseSchema
      ),
  },
}
