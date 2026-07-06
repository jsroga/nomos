'use client'

import { createContext, useContext } from 'react'

export interface LiquidContextType {
  bgElement: HTMLDivElement | null
  liquidOptions: {
    refraction: number
    bevelWidth: number
    bevelDepth: number
    intensity: number
    frost: number
    specular: boolean
    speed: number
  }
}

const LiquidContext = createContext<LiquidContextType | undefined>(undefined)

export const LiquidProvider = LiquidContext.Provider

export const useLiquid = () => {
  const context = useContext(LiquidContext)
  if (context === undefined) {
    throw new Error('useLiquid must be used within a LiquidProvider')
  }
  return context
}
