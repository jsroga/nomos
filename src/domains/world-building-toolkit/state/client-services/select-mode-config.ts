import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import { SegmentationProvider } from '../../constants/select-mode-service'

export function getSegmentationProvider(): SegmentationProvider {
  const provider = browserStorage.getString(LocalStorageKeys.AI_SEGMENTATION_PROVIDER)
  if (provider === SegmentationProvider.Replicate) return SegmentationProvider.Replicate
  return SegmentationProvider.Fal
}

export function getFalApiKey(): string {
  return browserStorage.getAiApiKey(LocalStorageKeys.AI_CONFIG_FAL)
}

export function getReplicateApiKey(): string {
  return browserStorage.getAiApiKey(LocalStorageKeys.AI_CONFIG_REPLICATE)
}

export function getSamParams(): {
  returnMultipleMasks?: boolean
  includeScores?: boolean
  includeBoxes?: boolean
} {
  const config = browserStorage.getJson(LocalStorageKeys.AI_CONFIG_FAL)
  if (!config) return {}
  return {
    returnMultipleMasks: config.returnMultipleMasks === true,
    includeScores: config.includeScores === true,
    includeBoxes: config.includeBoxes === true,
  }
}
