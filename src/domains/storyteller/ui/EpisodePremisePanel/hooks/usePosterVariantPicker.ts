import { useEffect, useRef, useState } from 'react'

interface PosterVariantPickerState {
  showVariantPicker: boolean
  gridImageUrl: string | null
  setShowVariantPicker: (open: boolean) => void
  setGridImageUrl: (url: string | null) => void
}

/** Only open the Midjourney quadrant picker when the completed image is a variant grid. */
export function usePosterVariantPicker(
  posterUrl: string | null | undefined,
  isGeneratingPoster: boolean,
  fullPosterUrl: string | null,
  isVariantGrid: boolean,
): PosterVariantPickerState {
  const [showVariantPicker, setShowVariantPicker] = useState(false)
  const [gridImageUrl, setGridImageUrl] = useState<string | null>(null)
  const prevPosterUrlRef = useRef(posterUrl)
  const prevIsGeneratingRef = useRef(isGeneratingPoster)

  useEffect(() => {
    const justFinished =
      prevIsGeneratingRef.current &&
      !isGeneratingPoster &&
      Boolean(posterUrl) &&
      posterUrl !== prevPosterUrlRef.current

    if (justFinished && isVariantGrid && fullPosterUrl) {
      queueMicrotask(() => {
        setGridImageUrl(fullPosterUrl)
        setShowVariantPicker(true)
      })
    }

    prevPosterUrlRef.current = posterUrl
    prevIsGeneratingRef.current = isGeneratingPoster
  }, [posterUrl, isGeneratingPoster, fullPosterUrl, isVariantGrid])

  return {
    showVariantPicker,
    gridImageUrl,
    setShowVariantPicker,
    setGridImageUrl,
  }
}
