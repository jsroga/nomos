import { task, logger, metadata } from '@trigger.dev/sdk/v3'
import { createSupabaseServiceClient } from '@/shared/auth/supabase-service'

interface SelectPortraitVariantPayload {
  projectId: string
  characterId: string
  gridImageUrl: string
  variantIndex: 1 | 2 | 3 | 4
}

export const selectPortraitVariant = task({
  id: 'select-portrait-variant',
  maxDuration: 120,
  retry: { maxAttempts: 1 },
  run: async (payload: SelectPortraitVariantPayload) => {
    const { projectId, characterId, gridImageUrl, variantIndex } = payload

    logger.info(`Cropping portrait variant ${variantIndex} from grid`, {
      gridImageUrl,
      characterId,
    })

    await metadata.set('progress', 10)
    await metadata.set('stage', 'downloading')

    // Download grid image
    const res = await fetch(gridImageUrl)
    if (!res.ok) {
      throw new Error(`Failed to download grid image: ${res.status}`)
    }
    const buffer = Buffer.from(await res.arrayBuffer())

    await metadata.set('progress', 40)
    await metadata.set('stage', 'cropping')

    // Crop selected quadrant using sharp
    const sharp = (await import('sharp')).default
    const img = sharp(buffer)
    const imgMetadata = await img.metadata()
    const width = imgMetadata.width || 1024
    const height = imgMetadata.height || 1024
    const hw = Math.floor(width / 2)
    const hh = Math.floor(height / 2)

    // Map variant positions: 1=top-left, 2=top-right, 3=bottom-left, 4=bottom-right
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

    // Save cropped image to disk
    const fs = await import('fs')
    const path = await import('path')
    const filename = `portrait_${characterId}_v${variantIndex}_${Date.now()}.png`
    const projectDir = path.join(process.cwd(), 'public', 'projects', projectId, 'portraits')

    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true })
    }

    const filePath = path.join(projectDir, filename)
    fs.writeFileSync(filePath, cropped)
    logger.info(`Cropped portrait saved to ${filePath}`)

    await metadata.set('progress', 90)
    await metadata.set('stage', 'updating_db')

    // Update character in database with new portrait URL
    const localPath = `portraits/${filename}`
    const supabase = createSupabaseServiceClient()

    const { error: dbError } = await supabase
      .from('characters')
      .update({ portrait_url: localPath })
      .eq('id', characterId)

    if (dbError) {
      logger.error('Failed to update character in DB', { error: dbError })
      // Don't throw - image was saved successfully
    } else {
      logger.info(`Character ${characterId} portrait_url updated to ${localPath}`)
    }

    await metadata.set('progress', 100)
    await metadata.set('stage', 'completed')

    return {
      success: true,
      filename,
      imageUrl: `/projects/${projectId}/${localPath}`,
      characterId,
      variantIndex,
    }
  },
})
