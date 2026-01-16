import { Hyper3DClient } from '@/infrastructure/ai/hyper3d'
import { MeshyClient } from '@/infrastructure/ai/meshy'
import { LocalStorageKeys } from '@/constants/localStorage'

export type ThreeDProvider = 'hyper3d' | 'meshy'

export class ThreeDService {
  async generateModel(
    imageUrl: string,
    provider: ThreeDProvider,
    prompt?: string
  ): Promise<string> {
    let apiKey = ''

    if (typeof window !== 'undefined') {
      const configKey =
        provider === 'hyper3d'
          ? LocalStorageKeys.AI_CONFIG_HYPER3D
          : LocalStorageKeys.AI_CONFIG_MESHY
      const savedConfig = localStorage.getItem(configKey)
      if (savedConfig) {
        const config = JSON.parse(savedConfig)
        apiKey = config.apiKey
      }
    }

    if (!apiKey) {
      throw new Error(`API Key for ${provider} not found. Please set it in Settings.`)
    }

    // Since API calls are made client-side in this architecture (or rather, keys are stored client side),
    // we instantiate the client here.

    if (provider === 'hyper3d') {
      const client = new Hyper3DClient(apiKey)
      return client.generateModel(imageUrl, prompt)
    } else if (provider === 'meshy') {
      const client = new MeshyClient(apiKey)
      return client.generateModel(imageUrl)
    }

    throw new Error('Invalid 3D Provider')
  }
}

export const threeDService = new ThreeDService()
