import type { Dispatch, SetStateAction } from 'react'
import { saveEpisodePosterVariant } from '@/domains/storyteller/core/io/storyteller.api'
import {
  EPISODE_PREMISE_LOG_NO_EPISODE,
  EPISODE_PREMISE_LOG_SAVE_API,
  EPISODE_PREMISE_LOG_SAVE_ERROR,
  EPISODE_PREMISE_LOG_SAVED,
  EPISODE_PREMISE_LOG_VARIANT_SELECT,
} from '../constants/episode-premise-panel'
import { LocalPremise } from '../hooks/useEpisodePremiseLocalState'

interface VariantSelectParams {
  variantIndex: number
  croppedDataUrl: string
  episodeId?: string
  projectId: string
  localPremise: LocalPremise
  setLocalPremise: Dispatch<SetStateAction<LocalPremise>>
  setShowVariantPicker: (open: boolean) => void
  setGridImageUrl: (url: string | null) => void
  onUpdate: (updates: LocalPremise) => void
}

export async function handleEpisodePosterVariantSelect({
  variantIndex,
  croppedDataUrl,
  episodeId,
  projectId,
  localPremise,
  setLocalPremise,
  setShowVariantPicker,
  setGridImageUrl,
  onUpdate,
}: VariantSelectParams): Promise<void> {
  console.log(EPISODE_PREMISE_LOG_VARIANT_SELECT, {
    variantIndex,
    episodeId,
    projectId,
    hasData: !!croppedDataUrl,
  })
  setShowVariantPicker(false)
  setGridImageUrl(null)
  setLocalPremise(prev => ({ ...prev, poster: croppedDataUrl }))

  if (!episodeId) {
    console.warn(EPISODE_PREMISE_LOG_NO_EPISODE)
    onUpdate({ ...localPremise, poster: croppedDataUrl })
    return
  }

  try {
    console.log(EPISODE_PREMISE_LOG_SAVE_API)
    const { posterUrl } = await saveEpisodePosterVariant({
      episodeId,
      projectId,
      croppedImageDataUrl: croppedDataUrl,
      variantIndex,
    })
    if (posterUrl) {
      setLocalPremise(prev => ({ ...prev, poster: posterUrl }))
      onUpdate({ ...localPremise, poster: posterUrl })
      console.log(EPISODE_PREMISE_LOG_SAVED, posterUrl)
    }
  } catch (error) {
    console.error(EPISODE_PREMISE_LOG_SAVE_ERROR, error)
  }
}
