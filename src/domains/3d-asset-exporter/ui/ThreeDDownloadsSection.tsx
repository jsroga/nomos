'use client'

import React from 'react'
import { Download, Layers } from 'lucide-react'
import { Button } from '@/components/Button'
import type { MeshyResult } from '../core/types/three-d-generation'
import { ModelFormatKey, ModelFormatLabel } from '../constants/three-d-operation-wire'

enum TextureDownloadLabel {
  BaseColor = 'Base Color',
  Normal = 'Normal',
  Metallic = 'Metallic',
  Roughness = 'Roughness',
}

enum TextureDownloadFile {
  BaseColor = 'texture_base_color.png',
  Normal = 'texture_normal.png',
  Metallic = 'texture_metallic.png',
  Roughness = 'texture_roughness.png',
}

interface ThreeDDownloadsSectionProps {
  modelUrl: string
  remeshModelUrl: string | null
  showRemeshed: boolean
  setShowRemeshed: (v: boolean) => void
  remeshResult: MeshyResult | null
  generationResult: MeshyResult | null
  handleDownload: (url: string, filename: string) => void
  handleRegenerate: () => void
}

const MODEL_FORMATS: Array<{ key: ModelFormatKey; label: ModelFormatLabel }> = [
  { key: ModelFormatKey.Glb, label: ModelFormatLabel.Glb },
  { key: ModelFormatKey.Fbx, label: ModelFormatLabel.Fbx },
  { key: ModelFormatKey.Obj, label: ModelFormatLabel.Obj },
  { key: ModelFormatKey.Usdz, label: ModelFormatLabel.Usdz },
]

function ModelFormatButtons(props: {
  urls: NonNullable<MeshyResult['model_urls']>
  prefix: string
  handleDownload: (url: string, filename: string) => void
}) {
  const { urls, prefix, handleDownload } = props
  return (
    <>
      {MODEL_FORMATS.map(format => {
        const url = urls[format.key]
        if (!url) return null
        return (
          <Button
            key={format.key}
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => handleDownload(url, `${prefix}.${format.key}`)}
          >
            <Download size={14} />
            {format.label}
          </Button>
        )
      })}
    </>
  )
}

function TextureDownloadButtons(props: {
  texture: NonNullable<MeshyResult['texture_urls']>[number]
  handleDownload: (url: string, filename: string) => void
}) {
  const { texture, handleDownload } = props
  const entries: Array<{ url?: string; label: TextureDownloadLabel; file: TextureDownloadFile }> = [
    { url: texture.base_color, label: TextureDownloadLabel.BaseColor, file: TextureDownloadFile.BaseColor },
    { url: texture.normal, label: TextureDownloadLabel.Normal, file: TextureDownloadFile.Normal },
    { url: texture.metallic, label: TextureDownloadLabel.Metallic, file: TextureDownloadFile.Metallic },
    { url: texture.roughness, label: TextureDownloadLabel.Roughness, file: TextureDownloadFile.Roughness },
  ]

  return (
    <div className="space-y-2">
      <span className="text-xs text-muted-foreground">Textures</span>
      <div className="flex flex-wrap gap-2">
        {entries.map(entry =>
          entry.url ? (
            <Button
              key={entry.file}
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => handleDownload(entry.url ?? '', entry.file)}
            >
              {entry.label}
            </Button>
          ) : null
        )}
      </div>
    </div>
  )
}

function VersionSwitcher(props: {
  showRemeshed: boolean
  setShowRemeshed: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between pb-2 border-b border-border/50">
      <span className="text-xs text-muted-foreground">Viewing:</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => props.setShowRemeshed(false)}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            !props.showRemeshed
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80 text-muted-foreground'
          }`}
        >
          Original
        </button>
        <button
          onClick={() => props.setShowRemeshed(true)}
          className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${
            props.showRemeshed
              ? 'bg-blue-500 text-white'
              : 'bg-muted hover:bg-muted/80 text-muted-foreground'
          }`}
        >
          <Layers size={10} />
          Remeshed
        </button>
      </div>
    </div>
  )
}

export function ThreeDDownloadsSection({
  modelUrl,
  remeshModelUrl,
  showRemeshed,
  setShowRemeshed,
  remeshResult,
  generationResult,
  handleDownload,
  handleRegenerate,
}: ThreeDDownloadsSectionProps) {
  const texture = generationResult?.texture_urls?.[0]
  const remeshUrls = remeshResult?.model_urls
  const generationUrls = generationResult?.model_urls

  return (
    <div className="p-3 border-t border-border bg-muted/10 space-y-3">
      {remeshModelUrl ? (
        <VersionSwitcher showRemeshed={showRemeshed} setShowRemeshed={setShowRemeshed} />
      ) : null}

      <div className="flex flex-wrap gap-2">
        {showRemeshed && remeshUrls ? (
          <ModelFormatButtons
            urls={remeshUrls}
            prefix="model_remeshed"
            handleDownload={handleDownload}
          />
        ) : generationUrls ? (
          <ModelFormatButtons urls={generationUrls} prefix="model" handleDownload={handleDownload} />
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => handleDownload(modelUrl, 'model.glb')}
          >
            <Download size={14} />
            Download
          </Button>
        )}
      </div>

      {texture ? <TextureDownloadButtons texture={texture} handleDownload={handleDownload} /> : null}

      <div className="flex justify-end pt-2 border-t border-border/50">
        <button onClick={handleRegenerate} className="text-xs text-primary hover:underline">
          Regenerate
        </button>
      </div>
    </div>
  )
}
