/**
 * The definitive check SPEC-16 names: a production-shaped payload parsed
 * through the contract, asserted as a domain object. If a caller still needs
 * `recordFromJson` afterwards, the contract is incomplete and the reads moved
 * one level rather than moving behind a boundary.
 */
import { describe, expect, it } from 'vitest'
import {
  GenerationStatus,
  MeshyTopology,
  generationMetadataToRow,
  parseGenerationMetadata,
} from '../index'
import { generationMetadataRowSchema } from '../generation-metadata.schema'

/** The shape Meshy actually stores, taken from the module's own wire types. */
const STORED_METADATA = {
  trigger_run_id: 'run_abc123',
  meshy_task_id: 'meshy_0199',
  generation_status: 'completed',
  generation_started_at: '2026-08-28T10:00:00.000Z',
  provider: 'meshy',
  topology: 'quad',
  target_polycount: 30000,
  generation_result: {
    model_url: 'https://assets.test/model.glb',
    model_urls: { glb: 'https://assets.test/model.glb', fbx: 'https://assets.test/model.fbx' },
    texture_urls: [
      { base_color: 'https://assets.test/base.png', normal: 'https://assets.test/normal.png' },
    ],
    thumbnail_url: 'https://assets.test/thumb.png',
    progress: 100,
    status: 'SUCCEEDED',
  },
  remesh_run_id: 'run_def456',
  remesh_status: 'processing',
  remesh_meshy_task_id: 'meshy_0200',
  remesh_result: { model_urls: { glb: 'https://assets.test/remesh.glb' } },
}

describe('parseGenerationMetadata', () => {
  it('parses a stored payload into camelCase with no further guarding', () => {
    const metadata = parseGenerationMetadata(STORED_METADATA)

    expect(metadata).toEqual({
      triggerRunId: 'run_abc123',
      meshyTaskId: 'meshy_0199',
      generationStatus: GenerationStatus.Completed,
      generationStartedAt: '2026-08-28T10:00:00.000Z',
      provider: 'meshy',
      topology: MeshyTopology.Quad,
      targetPolycount: 30000,
      generationResult: {
        modelUrl: 'https://assets.test/model.glb',
        modelUrls: { glb: 'https://assets.test/model.glb', fbx: 'https://assets.test/model.fbx' },
        textureUrls: [
          { baseColor: 'https://assets.test/base.png', normal: 'https://assets.test/normal.png' },
        ],
        thumbnailUrl: 'https://assets.test/thumb.png',
        progress: 100,
        status: 'SUCCEEDED',
      },
      remeshRunId: 'run_def456',
      remeshStatus: GenerationStatus.Processing,
      remeshMeshyTaskId: 'meshy_0200',
      remeshResult: { modelUrls: { glb: 'https://assets.test/remesh.glb' } },
    })
  })

  it('parses an empty metadata bag, which is what a fresh asset has', () => {
    expect(parseGenerationMetadata({})).toEqual({})
  })

  it('degrades to null on a shape it cannot recognise, rather than throwing', () => {
    expect(parseGenerationMetadata({ generation_status: 'exploded' })).toBeNull()
    expect(parseGenerationMetadata('not an object')).toBeNull()
  })

  it('drops an unknown key rather than carrying it, so a stray spelling cannot spread', () => {
    const parsed = generationMetadataRowSchema.safeParse({ ...STORED_METADATA, meshyTaskId: 'x' })

    expect(parsed.success).toBe(true)
    expect(parsed.success && 'meshyTaskId' in parsed.data).toBe(false)
  })

  it('keeps the rest of a legacy row that carries a key this contract never knew', () => {
    const legacy = { ...STORED_METADATA, retired_field: 'from an older version' }

    expect(parseGenerationMetadata(legacy)?.meshyTaskId).toBe('meshy_0199')
  })

  it('maps every field the schema declares — a forgotten mapper entry fails here', () => {
    const domain = parseGenerationMetadata(STORED_METADATA)
    const declared = Object.keys(generationMetadataRowSchema.shape)

    expect(Object.keys(generationMetadataToRow(domain ?? {})).sort()).toEqual(declared.sort())
  })

  it('tolerates an unknown key inside the provider result, which is Meshy to change', () => {
    const withNewField = {
      ...STORED_METADATA,
      generation_result: { ...STORED_METADATA.generation_result, some_new_meshy_field: 1 },
    }

    expect(parseGenerationMetadata(withNewField)).not.toBeNull()
  })
})

describe('generationMetadataToRow', () => {
  it('round-trips a stored payload back to its stored spelling', () => {
    const metadata = parseGenerationMetadata(STORED_METADATA)

    expect(generationMetadataToRow(metadata ?? {})).toEqual(STORED_METADATA)
  })

  it('writes only the fields a patch names, so a partial save clears nothing', () => {
    const row = generationMetadataToRow({ generationStatus: GenerationStatus.Failed })

    expect(row).toEqual({ generation_status: GenerationStatus.Failed })
  })
})
