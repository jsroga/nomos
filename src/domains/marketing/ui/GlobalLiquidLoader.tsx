'use client'

import { LIQUID_GL_SCRIPTS_LOADED_LOG } from '@/domains/marketing/constants/liquid'
import '@/domains/marketing/constants/liquid-globals'
import { useEffect, useState } from 'react'
import Script from 'next/script'

export function GlobalLiquidLoader() {
  const [scriptsLoaded, setScriptsLoaded] = useState({
    jquery: false,
    html2canvas: false,
    ripples: false,
    liquidGL: false,
  })

  useEffect(() => {
    if (
      scriptsLoaded.jquery &&
      scriptsLoaded.html2canvas &&
      scriptsLoaded.ripples &&
      scriptsLoaded.liquidGL
    ) {
      console.log(LIQUID_GL_SCRIPTS_LOADED_LOG)
    }
  }, [scriptsLoaded])

  return (
    <>
      <Script
        src="/scripts/html2canvas.min.js"
        strategy="lazyOnload"
        onLoad={() => setScriptsLoaded(prev => ({ ...prev, html2canvas: true }))}
      />
      <Script
        src="https://code.jquery.com/jquery-3.7.1.min.js"
        strategy="lazyOnload"
        onLoad={() => setScriptsLoaded(prev => ({ ...prev, jquery: true }))}
      />
      <Script
        src="/scripts/jquery.ripples-min.js"
        strategy="lazyOnload"
        onLoad={() => setScriptsLoaded(prev => ({ ...prev, ripples: true }))}
      />
      <Script
        src="/scripts/liquidGL.js"
        strategy="lazyOnload"
        onLoad={() => setScriptsLoaded(prev => ({ ...prev, liquidGL: true }))}
      />
    </>
  )
}
