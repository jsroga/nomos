import type { ReactNode } from 'react'

export const OVERLAY_IFRAME_HEIGHT = 520
export const OVERLAY_LIGHTBOX_HEIGHT = 600
export const OVERLAY_MIN_HEIGHT_CLASS = 'min-h-[480px]'
export const OVERLAY_LIGHTBOX_MIN_HEIGHT_CLASS = 'min-h-[560px]'

export function overlayStoryParams(iframeHeight = OVERLAY_IFRAME_HEIGHT) {
  return {
    layout: 'fullscreen' as const,
    docs: {
      story: {
        inline: false,
        iframeHeight,
      },
    },
  }
}

export function OverlayCanvas({
  children,
  className = OVERLAY_MIN_HEIGHT_CLASS,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={className}>{children}</div>
}

export function neverResolves(): Promise<void> {
  return new Promise(() => {})
}
