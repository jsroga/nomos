'use client'

import { useSyncExternalStore } from 'react'
import {
  getAssetUploadQueue,
  subscribeAssetUploadQueue,
} from '@/shared/workspace/asset-upload-queue'

export function useAssetUploadQueue() {
  return useSyncExternalStore(subscribeAssetUploadQueue, getAssetUploadQueue, getAssetUploadQueue)
}
