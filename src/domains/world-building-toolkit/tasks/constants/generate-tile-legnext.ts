import { logger, metadata } from '@trigger.dev/sdk/v3'
import { GENERATION_PROMPTS, MASK_CONFIG } from '@/shared/data/server/prompts'
import { imageService, type StyleInfo } from '@/shared/data/server/image-service'
import { storageService } from '@/shared/data/storage/storage-service'
import {
  logLLMRequestComplete,
  logLLMRequestError,
  logLLMRequestStart,
} from '@/trigger/utils/llm-logger'
import type { AiProviderConfig } from '@/shared/ai/ai-provider-config'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import { LegNextModelId } from '@/shared/ai/constants/legnext'
import { BufferEncoding, ContentType, HttpMethod } from '@/shared/data/constants/protocol'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'
import { wait } from '@trigger.dev/sdk/v3'
import {
  CONTEXT_CANVAS_SIZE,
  TILE_CROP_SIZE,
  VariantSelectionAction,
} from './generate-tile'
import { parseLegNextJob, readLegNextImageUrl } from './generate-tile-json-guards'
import { pollLegNextTask } from './generate-tile-legnext-poll'

async function analyzeStyleWithSharp(imageBase64: string): Promise<StyleInfo> {
  return imageService.analyzeStyle(Buffer.from(imageBase64, BufferEncoding.Base64))
}

async function uploadLegNextSourceImage(
  isFirstTile: boolean,
  contextImageBase64: string | undefined
): Promise<string> {
  if (!isFirstTile && contextImageBase64) {
    await metadata.set('stage', 'uploading_context_image')
    await metadata.set('progress', 32)
    const tempFilename = `generate_temp_${uuidv4()}.png`
    const publicImageUrl = await storageService.uploadPublicImage(tempFilename, contextImageBase64)
    if (!publicImageUrl) {
      throw new Error('Failed to upload context image for generation')
    }
    logger.info('Context image uploaded', { publicImageUrl })
    return publicImageUrl
  }

  logger.info('First tile generation - creating blank canvas for upload_paint')
  await metadata.set('stage', 'uploading_blank_canvas')
  await metadata.set('progress', 30)

  const blankPng = await sharp({
    create: {
      width: CONTEXT_CANVAS_SIZE,
      height: CONTEXT_CANVAS_SIZE,
      channels: 3,
      background: { r: 180, g: 180, b: 180 },
    },
  })
    .png()
    .toBuffer()

  const blankBase64 = `data:${ContentType.Png};base64,${blankPng.toString(BufferEncoding.Base64)}`
  const tempFilename = `first_tile_canvas_${uuidv4()}.png`
  const publicImageUrl = await storageService.uploadPublicImage(tempFilename, blankBase64)
  if (!publicImageUrl) {
    throw new Error('Failed to upload blank canvas for first tile generation')
  }
  logger.info('Blank canvas uploaded for first tile', { publicImageUrl })
  return publicImageUrl
}

async function buildLegNextRemixPrompt(
  isFirstTile: boolean,
  prompt: string,
  styleContext: string | undefined,
  contextImageBase64: string | undefined
): Promise<string> {
  if (isFirstTile) {
    return GENERATION_PROMPTS.FIRST_TILE.MIDJOURNEY(prompt, styleContext)
  }
  let styleInfo = 'medium neutral palette'
  if (contextImageBase64) {
    const analysis = await analyzeStyleWithSharp(contextImageBase64)
    styleInfo = analysis.description
  }
  return GENERATION_PROMPTS.FOLLOW_UP.MIDJOURNEY(prompt, styleInfo)
}

async function buildLegNextMaskField(isFirstTile: boolean): Promise<object> {
  if (!isFirstTile) {
    logger.info('Building follow-up mask: white center 512×512 at (256,256) on black 1024×1024')
    const whiteSquare = await sharp({
      create: { width: 512, height: 512, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .png()
      .toBuffer()
    const maskPng = await sharp({
      create: { width: CONTEXT_CANVAS_SIZE, height: CONTEXT_CANVAS_SIZE, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .composite([{ input: whiteSquare, left: 256, top: 256 }])
      .png()
      .toBuffer()
    const maskBase64 = `data:${ContentType.Png};base64,${maskPng.toString(BufferEncoding.Base64)}`
    const maskFilename = `masks/followup_${uuidv4()}.png`
    const maskUrl = await storageService.uploadPublicImage(maskFilename, maskBase64)
    if (!maskUrl) throw new Error('Failed to upload follow-up mask')
    logger.info('Follow-up mask uploaded', { maskUrl })
    return { url: maskUrl }
  }
  const fc = MASK_CONFIG.FULL_CANVAS
  return { areas: [{ width: fc.width, height: fc.height, points: fc.points }] }
}

async function submitLegNextUploadPaint(
  config: AiProviderConfig,
  publicImageUrl: string,
  maskField: object,
  remixPrompt: string
): Promise<string> {
  const uploadPaintPayload = {
    imgUrl: publicImageUrl,
    canvas: { width: CONTEXT_CANVAS_SIZE, height: CONTEXT_CANVAS_SIZE },
    imgPos: { width: CONTEXT_CANVAS_SIZE, height: CONTEXT_CANVAS_SIZE, x: 0, y: 0 },
    mask: maskField,
    remixPrompt,
  }

  logLLMRequestStart({
    provider: ImageGenProvider.Midjourney,
    model: LegNextModelId.UploadPaint,
    prompt: remixPrompt,
    inputImageUrls: [publicImageUrl],
    input: uploadPaintPayload,
    metadata: { endpoint: 'upload-paint' },
  })

  const uploadPaintResponse = await fetch('https://api.legnext.ai/api/v1/upload-paint', {
    method: HttpMethod.Post,
    headers: {
      'x-api-key': config.apiKey,
      'Content-Type': ContentType.Json,
    },
    body: JSON.stringify(uploadPaintPayload),
  })

  if (!uploadPaintResponse.ok) {
    const errorText = await uploadPaintResponse.text()
    logLLMRequestError({
      provider: ImageGenProvider.Midjourney,
      model: LegNextModelId.UploadPaint,
      prompt: remixPrompt,
      error: `HTTP ${uploadPaintResponse.status}: ${errorText}`,
      input: uploadPaintPayload,
    })
    throw new Error(
      `LegNext upload_paint submission failed: ${uploadPaintResponse.status} - ${errorText}`
    )
  }

  const uploadPaintData = parseLegNextJob(await uploadPaintResponse.json())
  const jobId = uploadPaintData.job_id
  if (!jobId) {
    logLLMRequestError({
      provider: ImageGenProvider.Midjourney,
      model: LegNextModelId.UploadPaint,
      prompt: remixPrompt,
      error: 'No job_id returned',
      input: uploadPaintPayload,
      output: uploadPaintData,
    })
    throw new Error('LegNext upload_paint failed: No job_id returned')
  }
  return jobId
}

async function extractVariantUrls(gridImageUrl: string, isFirstTile: boolean): Promise<string[]> {
  const gridResponse = await fetch(gridImageUrl)
  if (!gridResponse.ok) throw new Error(`Failed to fetch grid image: ${gridResponse.status}`)
  const gridBuffer = Buffer.from(await gridResponse.arrayBuffer())

  const gridMeta = await sharp(gridBuffer).metadata()
  const gW = gridMeta.width ?? 2048
  const gH = gridMeta.height ?? 2048
  const varW = Math.round(gW / 2)
  const varH = Math.round(gH / 2)
  logger.info('Grid dimensions', { gW, gH, varW, varH })

  const quadrants = [
    { col: 0, row: 0 },
    { col: 1, row: 0 },
    { col: 0, row: 1 },
    { col: 1, row: 1 },
  ]

  const variantUrls: string[] = []
  for (const { col, row } of quadrants) {
    const cropLeft = !isFirstTile ? Math.round(col * varW + varW * 0.25) : col * varW
    const cropTop = !isFirstTile ? Math.round(row * varH + varH * 0.25) : row * varH
    const cropWidth = !isFirstTile ? Math.round(varW * 0.5) : varW
    const cropHeight = !isFirstTile ? Math.round(varH * 0.5) : varH

    const tileBuf = await sharp(gridBuffer)
      .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
      .resize(TILE_CROP_SIZE, TILE_CROP_SIZE, { fit: 'fill' })
      .png()
      .toBuffer()

    const tileBase64 = `data:${ContentType.Png};base64,${tileBuf.toString(BufferEncoding.Base64)}`
    const variantFilename = `variants/${uuidv4()}.png`
    const variantUrl = await storageService.uploadPublicImage(variantFilename, tileBase64)
    if (!variantUrl) throw new Error(`Failed to upload variant ${col}_${row}`)
    variantUrls.push(variantUrl)
  }
  return variantUrls
}

async function waitForVariantSelection(
  variantUrls: string[],
  jobId: string
): Promise<{ action: VariantSelectionAction; variantIndex: number }> {
  const waitToken = await wait.createToken({ timeout: '30m' })
  await metadata.set('stage', 'waiting_variant_selection')
  await metadata.set('variantUrls', variantUrls)
  await metadata.set('gridJobId', jobId)
  await metadata.set('waitTokenId', waitToken.id)
  await metadata.set('progress', 70)

  const selection = await wait.forToken<{ action: VariantSelectionAction; variantIndex: number }>(
    waitToken.id
  )
  if (!selection.ok) {
    throw new Error('Variant selection timed out or was cancelled')
  }
  return selection.output
}

async function downloadAcceptedVariant(variantUrls: string[], variantIndex: number): Promise<string> {
  await metadata.set('stage', 'finalizing_accepted_variant')
  await metadata.set('progress', 90)
  const acceptedUrl = variantUrls[variantIndex]
  const acceptResp = await fetch(acceptedUrl)
  if (!acceptResp.ok) throw new Error(`Failed to fetch accepted variant: ${acceptResp.status}`)
  const acceptBuf = Buffer.from(await acceptResp.arrayBuffer())
  return acceptBuf.toString(BufferEncoding.Base64)
}

async function upscaleLegNextVariant(
  config: AiProviderConfig,
  jobId: string,
  variantIndex: number,
  remixPrompt: string,
  gridImageUrl: string,
  isFirstTile: boolean
): Promise<string> {
  await metadata.set('stage', 'submitting_upscale')
  await metadata.set('progress', 75)

  const upscalePayload = { jobId, imageNo: variantIndex, type: 0 }
  logLLMRequestStart({
    provider: ImageGenProvider.Midjourney,
    model: LegNextModelId.Upscale,
    prompt: remixPrompt,
    inputImageUrls: [gridImageUrl],
    input: upscalePayload,
    metadata: { endpoint: 'upscale', variantIndex },
  })

  const upscaleResponse = await fetch('https://api.legnext.ai/api/v1/upscale', {
    method: HttpMethod.Post,
    headers: {
      'x-api-key': config.apiKey,
      'Content-Type': ContentType.Json,
    },
    body: JSON.stringify(upscalePayload),
  })

  if (!upscaleResponse.ok) {
    const errorText = await upscaleResponse.text()
    logLLMRequestError({
      provider: ImageGenProvider.Midjourney,
      model: LegNextModelId.Upscale,
      prompt: remixPrompt,
      error: `HTTP ${upscaleResponse.status}: ${errorText}`,
      input: upscalePayload,
    })
    throw new Error(`LegNext upscale submission failed: ${upscaleResponse.status} - ${errorText}`)
  }

  const upscaleData = parseLegNextJob(await upscaleResponse.json())
  const upscaleJobId = upscaleData.job_id
  if (!upscaleJobId) {
    throw new Error('LegNext upscale failed: No job_id returned')
  }

  await metadata.set('upscale_task_id', upscaleJobId)
  await metadata.set('stage', 'waiting_upscale')
  await metadata.set('progress', 80)

  const upscaleResult = await pollLegNextTask(upscaleJobId, config.apiKey, 300, 80)
  const imageUrl = readLegNextImageUrl(upscaleResult)
  if (!imageUrl) throw new Error('LegNext upscale result missing image_url')

  logLLMRequestComplete({
    provider: ImageGenProvider.Midjourney,
    model: LegNextModelId.Upscale,
    prompt: remixPrompt,
    outputImageUrls: [imageUrl],
    output: upscaleResult.output,
  })

  await metadata.set('stage', 'downloading_upscaled')
  await metadata.set('progress', 92)

  const imgResponse = await fetch(imageUrl)
  if (!imgResponse.ok) throw new Error(`Failed to fetch upscaled image: ${imgResponse.status}`)
  const buffer = Buffer.from(await imgResponse.arrayBuffer())

  if (!isFirstTile) {
    const meta = await sharp(buffer).metadata()
    const W = meta.width ?? CONTEXT_CANVAS_SIZE
    const H = meta.height ?? CONTEXT_CANVAS_SIZE
    const cropX = Math.round(W * 0.25)
    const cropY = Math.round(H * 0.25)
    const cropW = Math.round(W * 0.5)
    const cropH = Math.round(H * 0.5)
    const croppedBuffer = await sharp(buffer)
      .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
      .resize(TILE_CROP_SIZE, TILE_CROP_SIZE, { fit: 'fill' })
      .png()
      .toBuffer()
    return croppedBuffer.toString(BufferEncoding.Base64)
  }

  const resizedBuffer = await sharp(buffer)
    .resize(TILE_CROP_SIZE, TILE_CROP_SIZE, { fit: 'fill' })
    .png()
    .toBuffer()
  return resizedBuffer.toString(BufferEncoding.Base64)
}

export async function generateWithLegNext(
  prompt: string,
  config: AiProviderConfig,
  isFirstTile: boolean,
  styleReferenceUrls?: string[],
  contextImageBase64?: string,
  styleContext?: string
): Promise<string> {
  logger.info('Starting Midjourney generation via LegNext API', { isFirstTile, styleReferenceUrls })

  const publicImageUrl = await uploadLegNextSourceImage(isFirstTile, contextImageBase64)
  let remixPrompt = await buildLegNextRemixPrompt(
    isFirstTile,
    prompt,
    styleContext,
    contextImageBase64
  )
  if (styleReferenceUrls?.length) {
    remixPrompt += ` --sref ${styleReferenceUrls.join(' ')}`
  }
  logger.info('Using remix prompt', { remixPrompt })

  await metadata.set('stage', 'submitting_upload_paint')
  await metadata.set('progress', 35)

  const maskField = await buildLegNextMaskField(isFirstTile)
  const jobId = await submitLegNextUploadPaint(config, publicImageUrl, maskField, remixPrompt)
  await metadata.set('upload_paint_job_id', jobId)
  logger.info('Upload_paint task submitted', { jobId })

  await metadata.set('stage', 'waiting_upload_paint')
  await metadata.set('progress', 40)

  const uploadPaintResult = await pollLegNextTask(jobId, config.apiKey, 300, 40)
  const uploadPaintImageUrl = readLegNextImageUrl(uploadPaintResult)
  logLLMRequestComplete({
    provider: ImageGenProvider.Midjourney,
    model: LegNextModelId.UploadPaint,
    prompt: remixPrompt,
    outputImageUrls: uploadPaintImageUrl ? [uploadPaintImageUrl] : undefined,
    output: uploadPaintResult.output,
  })

  await metadata.set('stage', 'processing_variants')
  await metadata.set('progress', 65)

  const gridImageUrl = readLegNextImageUrl(uploadPaintResult)
  if (!gridImageUrl) throw new Error('upload_paint result missing image_url')

  const variantUrls = await extractVariantUrls(gridImageUrl, isFirstTile)
  logger.info('Variant tiles uploaded', { count: variantUrls.length })

  const { action, variantIndex } = await waitForVariantSelection(variantUrls, jobId)
  logger.info('User made variant selection', { action, variantIndex })

  if (action === VariantSelectionAction.Accept) {
    return downloadAcceptedVariant(variantUrls, variantIndex)
  }

  return upscaleLegNextVariant(
    config,
    jobId,
    variantIndex,
    remixPrompt,
    gridImageUrl,
    isFirstTile
  )
}
