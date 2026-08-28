import { logger, metadata } from '@trigger.dev/sdk/v3'
import { JobQueue, defineOwnedTask } from '@/shared/jobs'
import { createSupabaseServiceClient } from './constants/generate-tile-persist'
import { selectMjVariantPayloadSchema } from './constants/select-mj-variant-payload'

export const selectMjVariantTask = defineOwnedTask({
  id: 'select-mj-variant',
  schema: selectMjVariantPayloadSchema,
  queue: JobQueue.Storage,
  maxDuration: 120,
  retry: { maxAttempts: 1 },
  run: async payload => {
    const { tileId, projectId, gridImageUrl, variantIndex } = payload

    logger.info(`Cropping variant ${variantIndex} from grid`, { gridImageUrl })

    await metadata.set('progress', 10)
    await metadata.set('stage', 'downloading')

    // Download grid
    const res = await fetch(gridImageUrl)
    const buffer = Buffer.from(await res.arrayBuffer())

    await metadata.set('progress', 40)
    await metadata.set('stage', 'cropping')

    // Crop quadrant
    const sharp = (await import('sharp')).default
    const img = sharp(buffer)
    const { width = 1024, height = 1024 } = await img.metadata()
    const hw = Math.floor(width / 2)
    const hh = Math.floor(height / 2)

    const crops: Record<number, { left: number; top: number }> = {
      1: { left: 0, top: 0 },
      2: { left: hw, top: 0 },
      3: { left: 0, top: hh },
      4: { left: hw, top: hh },
    }

    const cropped = await img
      .extract({ ...crops[variantIndex], width: hw, height: hh })
      .png()
      .toBuffer()

    await metadata.set('progress', 70)
    await metadata.set('stage', 'saving')

    // Save
    const fs = await import('fs')
    const path = await import('path')
    const filename = `${tileId}_mj_v${variantIndex}_${Date.now()}.png`
    const dir = path.join(process.cwd(), 'public', 'projects', projectId)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, filename), cropped)

    await metadata.set('progress', 90)
    await metadata.set('stage', 'updating_db')

    // Update DB
    const supabase = createSupabaseServiceClient()
    await supabase.from('tiles').update({ image_filename: filename }).eq('id', tileId)

    await metadata.set('progress', 100)
    await metadata.set('stage', 'completed')

    return { success: true, filename, imageUrl: `/projects/${projectId}/${filename}` }
  },
})
