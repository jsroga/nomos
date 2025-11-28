/**
 * Analyzes existing tiles to extract style information for prompt consistency.
 */

export interface StyleInfo {
  dominantColors: string[]
  brightness: 'bright' | 'medium' | 'dark'
  description: string
}

export async function analyzeStyle(imageUrl: string): Promise<StyleInfo> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'

    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('No canvas context'))
        return
      }

      // Scale down for faster analysis
      const size = 64
      canvas.width = size
      canvas.height = size
      ctx.drawImage(img, 0, 0, size, size)

      const imageData = ctx.getImageData(0, 0, size, size)
      const data = imageData.data

      // Sample colors (every 4th pixel to speed up)
      const colorCounts: Record<string, number> = {}
      let totalBrightness = 0
      let samples = 0

      for (let i = 0; i < data.length; i += 16) {
        // Sample every 4th pixel
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const a = data[i + 3]

        if (a < 128) continue // Skip transparent

        // Convert to hex
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
        colorCounts[hex] = (colorCounts[hex] || 0) + 1

        // Calculate brightness
        totalBrightness += (r + g + b) / 3
        samples++
      }

      // Get top 3 colors
      const sortedColors = Object.entries(colorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([color]) => color)

      // Calculate average brightness
      const avgBrightness = totalBrightness / samples
      let brightness: 'bright' | 'medium' | 'dark'
      if (avgBrightness > 180) brightness = 'bright'
      else if (avgBrightness > 80) brightness = 'medium'
      else brightness = 'dark'

      // Generate description
      const colorNames = sortedColors.map(hex => {
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)

        // Simple color naming
        if (r > g && r > b) return 'red-toned'
        if (g > r && g > b) return 'green-toned'
        if (b > r && b > g) return 'blue-toned'
        if (r > 200 && g > 200 && b > 200) return 'light'
        if (r < 50 && g < 50 && b < 50) return 'dark'
        return 'neutral-toned'
      })

      const description = `${brightness} palette with ${colorNames.join(', ')} colors`

      resolve({
        dominantColors: sortedColors,
        brightness,
        description,
      })
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = imageUrl
  })
}

export async function enhancePromptWithStyle(
  basePrompt: string,
  neighborTiles: Array<{ imageUrl?: string }>
): Promise<string> {
  // Analyze the first available neighbor for style
  for (const tile of neighborTiles) {
    if (tile?.imageUrl) {
      try {
        const style = await analyzeStyle(tile.imageUrl)
        // Inject style info into prompt
        return `${basePrompt}, maintaining ${style.description}, consistent art style`
      } catch (e) {
        console.error('Style analysis failed', e)
      }
    }
  }

  return basePrompt
}
