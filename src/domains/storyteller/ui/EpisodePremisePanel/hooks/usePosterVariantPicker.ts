import { useEffect, useRef, useState } from 'react'
import { EpisodePremiseUrlScheme } from '../constants/episode-premise-panel'

interface PosterVariantPickerState {
  showVariantPicker: boolean
  gridImageUrl: string | null
  setShowVariantPicker: (open: boolean) => void
  setGridImageUrl: (url: string | null) => void
}

export function usePosterVariantPicker(
  posterUrl: string | null | undefined,
  isGeneratingPoster: boolean,
  fullPosterUrl: string | null
): PosterVariantPickerState {
  const [showVariantPicker, setShowVariantPicker] = useState(false)
  const [gridImageUrl, setGridImageUrl] = useState<string | null>(null)
  const prevPosterUrlRef = useRef(posterUrl)
  const prevIsGeneratingRef = useRef(isGeneratingPoster)
  const hasCheckedInitialRef = useRef(false)

  useEffect(() => {
    const justFinished =
      prevIsGeneratingRef.current &&
      !isGeneratingPoster &&
      posterUrl &&
      posterUrl !== prevPosterUrlRef.current

    const isGrid = Boolean(posterUrl && posterUrl.startsWith(EpisodePremiseUrlScheme.Http))

    if ((justFinished || (!hasCheckedInitialRef.current && isGrid)) && fullPosterUrl) {
      queueMicrotask(() => {
        setGridImageUrl(fullPosterUrl)
        setShowVariantPicker(true)
      })
      hasCheckedInitialRef.current = true
    }

    prevPosterUrlRef.current = posterUrl
    prevIsGeneratingRef.current = isGeneratingPoster
  }, [posterUrl, isGeneratingPoster, fullPosterUrl])

  return {
    showVariantPicker,
    gridImageUrl,
    setShowVariantPicker,
    setGridImageUrl,
  }
}
