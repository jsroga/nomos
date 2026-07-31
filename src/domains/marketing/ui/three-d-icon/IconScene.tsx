'use client'

import {
  MarketingIconType,
  MarketingThreeDModelPath,
  resolveMarketingModelUrl,
} from '@/domains/marketing/constants/three-d-icon'
import { GLTFModel } from './GLTFModel'
import { KurvitzaSphere } from './KurvitzaSphere'

interface IconSceneProps {
  type: string
  density?: number
  glowScale?: number
  distortion?: number
  speed?: number
  frequency?: number
  contrast?: number
  twist?: number
  metalness?: number
  color?: string
  scale?: number
}

interface IconModelPreset {
  url: string
  dotsDensity: number
  includeSphere?: boolean
}

function resolveIconModelPreset(type: string, density: number | undefined): IconModelPreset {
  const lowDensity = density ?? 0.04
  const highDensity = density ?? 0.15

  switch (type) {
    case MarketingIconType.AiNarrative:
    case MarketingIconType.Neural:
      return {
        url: resolveMarketingModelUrl(MarketingThreeDModelPath.NeuralConnections),
        dotsDensity: lowDensity,
      }
    case MarketingIconType.SculptSim:
    case MarketingIconType.SecAst:
      return {
        url: resolveMarketingModelUrl(MarketingThreeDModelPath.EnchantedCosmosCode),
        dotsDensity: highDensity,
      }
    case MarketingIconType.ExportSec:
    case MarketingIconType.Exporter:
      return {
        url: resolveMarketingModelUrl(MarketingThreeDModelPath.PredatorCosmos),
        dotsDensity: highDensity,
      }
    case MarketingIconType.LoopDes:
      return {
        url: resolveMarketingModelUrl(MarketingThreeDModelPath.OceanicCosmos),
        dotsDensity: highDensity,
      }
    case MarketingIconType.WorldGen:
    case MarketingIconType.Generator:
    default:
      return {
        url: resolveMarketingModelUrl(MarketingThreeDModelPath.Cosmos),
        dotsDensity: highDensity,
      }
  }
}

function StrTstIconScene({
  density,
  glowScale,
  distortion,
  speed,
  frequency,
  contrast,
  twist,
  metalness,
  color,
  scale = 0.5,
}: IconSceneProps) {
  const highDensity = density ?? 0.15

  return (
    <group scale={scale}>
      <GLTFModel
        url={resolveMarketingModelUrl(MarketingThreeDModelPath.Realistic14k)}
        dotsDensity={density ?? highDensity}
        dotsColor={color}
        includeSphere={false}
        glowScale={glowScale}
        distortion={distortion}
        speed={speed}
        scale={1}
      />
      <KurvitzaSphere
        position={[
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.2,
        ]}
        radius={0.065 * Math.max(0.3, (glowScale ?? 1) * 2.5)}
        distortion={(distortion ?? 0.08) * Math.max(0.3, (glowScale ?? 1) * 2.5)}
        speed={speed ?? 0.15}
        frequency={frequency ?? 3.0}
        contrast={contrast ?? 6.0}
        twist={twist ?? 3.0}
        metalness={metalness ?? 0.95}
        glowScale={(glowScale ?? 1) * 0.2}
      />
    </group>
  )
}

export function IconScene(props: IconSceneProps) {
  const { type, scale = 0.5, glowScale, distortion, speed } = props

  if (type === MarketingIconType.StrTst) {
    return <StrTstIconScene {...props} />
  }

  const preset = resolveIconModelPreset(type, props.density)

  return (
    <GLTFModel
      url={preset.url}
      dotsDensity={preset.dotsDensity}
      glowScale={glowScale}
      distortion={distortion}
      speed={speed}
      scale={scale}
      includeSphere={preset.includeSphere ?? true}
    />
  )
}
