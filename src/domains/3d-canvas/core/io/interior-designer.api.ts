import { withSubmissionNonce, type Submitted } from '@/shared/jobs/submission-nonce'
import { TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { z } from 'zod'
import { readJsonBody } from '@/shared/data/fetch-json-record'
import { ContentType, HttpMethod } from '@/shared/data/constants/protocol'
import { TRIGGER_STATUS_FETCH_INIT } from '@/shared/data/constants/polling'
import { buildUrl } from '@/shared/data/url-builder'
import { INTERIOR_DESIGNER_API_BASE_PATH } from '../../config/module'
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

async function parseResponse<TSchema extends z.ZodTypeAny>(
  response: Response,
  schema: TSchema
): Promise<z.output<TSchema>> {
  const json = await readJsonBody(response, null)

  if (!response.ok) {
    const parsedError = apiErrorSchema.safeParse(json)
    throw new Error(
      parsedError.success ? parsedError.data.error : `Request failed with status ${response.status}`
    )
  }

  return schema.parse(json)
}

/** The three start calls mint their own nonce, so callers do not pass one. */
type SubmittedRetexture = Submitted<InteriorRetextureRequest>
type SubmittedTextTo3D = Submitted<InteriorTextTo3DRequest>
type SubmittedMaterial = Submitted<InteriorMaterialRequest>

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
    start: async (input: SubmittedRetexture): Promise<InteriorRetextureResponse> =>
      withSubmissionNonce(
        `${TRIGGER_TASK_ID.RETEXTURE_MODEL}:${input.projectId}:${input.assetId ?? ''}`,
        async requestId => {
          const parsed = interiorRetextureRequestSchema.parse({ ...input, requestId })

          return parseResponse(
            await fetch(`${INTERIOR_DESIGNER_API_BASE_PATH}/retexture`, {
              method: HttpMethod.Post,
              headers: { 'Content-Type': ContentType.Json },
              body: JSON.stringify(parsed),
            }),
            interiorRetextureResponseSchema
          )
        }
      ),

    getStatus: async (runId: string): Promise<InteriorRetextureStatusResponse> =>
      parseResponse(
        await fetch(
          `${INTERIOR_DESIGNER_API_BASE_PATH}/retexture/${runId}`,
          TRIGGER_STATUS_FETCH_INIT,
        ),
        interiorRetextureStatusResponseSchema
      ),
  },

  textTo3D: {
    start: async (input: SubmittedTextTo3D): Promise<InteriorTextTo3DResponse> =>
      withSubmissionNonce(
        `${TRIGGER_TASK_ID.TEXT_TO_3D}:${input.projectId}:${input.prompt}`,
        async requestId => {
          const parsed = interiorTextTo3DRequestSchema.parse({ ...input, requestId })

          return parseResponse(
            await fetch(`${INTERIOR_DESIGNER_API_BASE_PATH}/text-to-3d`, {
              method: HttpMethod.Post,
              headers: { 'Content-Type': ContentType.Json },
              body: JSON.stringify(parsed),
            }),
            interiorTextTo3DResponseSchema
          )
        }
      ),

    getStatus: async (taskId: string): Promise<InteriorTextTo3DStatusResponse> =>
      parseResponse(
        await fetch(
          `${INTERIOR_DESIGNER_API_BASE_PATH}/text-to-3d/${taskId}`,
          TRIGGER_STATUS_FETCH_INIT,
        ),
        interiorTextTo3DStatusResponseSchema
      ),
  },

  material: {
    start: async (input: SubmittedMaterial): Promise<InteriorMaterialResponse> =>
      withSubmissionNonce(
        `${TRIGGER_TASK_ID.SURFACE_MATERIAL}:${input.projectId}:${input.surfaceId}`,
        async requestId => {
          const parsed = interiorMaterialRequestSchema.parse({ ...input, requestId })

          return parseResponse(
            await fetch(`${INTERIOR_DESIGNER_API_BASE_PATH}/material`, {
              method: HttpMethod.Post,
              headers: { 'Content-Type': ContentType.Json },
              body: JSON.stringify(parsed),
            }),
            interiorMaterialResponseSchema
          )
        }
      ),

    getStatus: async (taskId: string): Promise<InteriorMaterialStatusResponse> =>
      parseResponse(
        await fetch(
          `${INTERIOR_DESIGNER_API_BASE_PATH}/material/${taskId}`,
          TRIGGER_STATUS_FETCH_INIT,
        ),
        interiorMaterialStatusResponseSchema
      ),
  },
}
