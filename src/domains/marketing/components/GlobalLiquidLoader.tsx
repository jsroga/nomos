'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'

// Extend Window interface for liquidGL
declare global {
  interface Window {
    liquidGL: (options: any) => any
  }
}

export function GlobalLiquidLoader() {
  const [scriptsLoaded, setScriptsLoaded] = useState({
    html2canvas: false,
    ripples: false,
    liquidGL: false,
  })

  useEffect(() => {
    if (scriptsLoaded.html2canvas && scriptsLoaded.ripples && scriptsLoaded.liquidGL) {
      console.log('LiquidGL scripts loaded globally.')
    }
  }, [scriptsLoaded])

  return (
    <>
      <Script
        src="/scripts/html2canvas.min.js"
        strategy="afterInteractive"
        onLoad={() => setScriptsLoaded(prev => ({ ...prev, html2canvas: true }))}
      />
      <Script src="https://code.jquery.com/jquery-3.7.1.min.js" strategy="beforeInteractive" />
      <Script
        src="/scripts/jquery.ripples-min.js"
        strategy="afterInteractive"
        onLoad={() => setScriptsLoaded(prev => ({ ...prev, ripples: true }))}
      />
      <Script
        src="/scripts/liquidGL.js"
        strategy="afterInteractive"
        onLoad={() => setScriptsLoaded(prev => ({ ...prev, liquidGL: true }))}
      />
    </>
  )
}
