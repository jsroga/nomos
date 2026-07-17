'use client'

import React from 'react'
import { Cuboid, Layers, Loader2, RefreshCw, Settings, Upload, XCircle } from 'lucide-react'
import { Button } from '@/components/Button'
import { AIProvider } from '@/shared/types/enums'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'

export interface ThreeDToolbarActionsProps {
  modelUrl: string | undefined
  provider: AIProvider
  setProvider: (p: AIProvider) => void
  isGenerating: boolean
  meshyTaskId: string | null
  isRecovering: boolean
  showSettings: boolean
  setShowSettings: (v: boolean) => void
  isRemeshing: boolean
  showRemeshSettings: boolean
  setShowRemeshSettings: (v: boolean) => void
  handleRecoverFromMeshy: () => void
  handleGenerate: () => void
  handleStopGeneration: () => void
  handleStopRemesh: () => void
  isUploading: boolean
  handleUpload: () => void
  handleStopUpload: () => void
}


function RemeshToolbarButtons(props: {
  modelUrl: string | undefined
  isGenerating: boolean
  isRemeshing: boolean
  meshyTaskId: string | null
  showRemeshSettings: boolean
  setShowRemeshSettings: (v: boolean) => void
  handleStopRemesh: () => void
}) {
  if (props.isRemeshing) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={props.handleStopRemesh}
        className="gap-1 text-destructive border-destructive/50 hover:bg-destructive/10"
      >
        <XCircle size={14} />
        Stop Remesh
      </Button>
    )
  }

  if (!(props.modelUrl && !props.isGenerating)) return null

  return (
    <Button
      size="sm"
      variant={props.showRemeshSettings ? 'secondary' : 'outline'}
      onClick={() => props.setShowRemeshSettings(!props.showRemeshSettings)}
      className="gap-1"
      disabled={!props.meshyTaskId}
      title={
        !props.meshyTaskId
          ? 'Generate a model first to enable remesh'
          : 'Configure and remesh this model'
      }
    >
      <Layers size={14} />
      Remesh
    </Button>
  )
}

function UploadToolbarButtons(props: {
  modelUrl: string | undefined
  isGenerating: boolean
  isRemeshing: boolean
  isUploading: boolean
  handleUpload: () => void
  handleStopUpload: () => void
}) {
  if (props.isUploading) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={props.handleStopUpload}
        className="gap-1 text-destructive border-destructive/50 hover:bg-destructive/10"
      >
        <XCircle size={14} />
        Stop Upload
      </Button>
    )
  }

  if (!(props.modelUrl && !props.isGenerating && !props.isRemeshing)) return null

  return (
    <Button size="sm" variant="outline" onClick={props.handleUpload} className="gap-1">
      <Upload size={14} />
      Upload
    </Button>
  )
}

export function ThreeDToolbarActions(props: ThreeDToolbarActionsProps) {
  const {
    modelUrl,
    provider,
    setProvider,
    isGenerating,
    meshyTaskId,
    isRecovering,
    showSettings,
    setShowSettings,
    isRemeshing,
    showRemeshSettings,
    setShowRemeshSettings,
    handleRecoverFromMeshy,
    handleGenerate,
    handleStopGeneration,
    handleStopRemesh,
    isUploading,
    handleUpload,
    handleStopUpload,
  } = props

  return (
    <div className="flex items-center gap-2">
      {!modelUrl && !isGenerating && meshyTaskId && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleRecoverFromMeshy}
          disabled={isRecovering}
          className="gap-1"
        >
          {isRecovering ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Recover
        </Button>
      )}

      {!modelUrl && !isGenerating && (
        <>
          <select
            className="h-8 text-xs bg-background border border-input rounded px-2 outline-none focus:ring-1 focus:ring-primary"
            value={provider}
            onChange={e => {
              const next = e.target.value
              if (next === AIProvider.Meshy || next === AIProvider.Hyper3D) setProvider(next)
            }}
            disabled={isGenerating}
          >
            <option value={AIProvider.Meshy}>Meshy (Meshy 6)</option>
            <option value={AIProvider.Hyper3D}>Hyper3D</option>
          </select>

          {provider === AIProvider.Meshy && (
            <Button
              size="sm"
              variant={showSettings ? 'secondary' : 'ghost'}
              onClick={() => setShowSettings(!showSettings)}
              className="gap-1 h-8 w-8 p-0"
              title="Generation settings"
            >
              <Settings size={14} />
            </Button>
          )}

          <Button
            id={TOUR_STEP_IDS.GENERATE_3D_BUTTON}
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="gap-1"
          >
            <Cuboid size={14} />
            Generate 3D
          </Button>
        </>
      )}

      {isGenerating && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleStopGeneration}
          className="gap-1 text-destructive border-destructive/50 hover:bg-destructive/10"
        >
          <XCircle size={14} />
          Stop
        </Button>
      )}

      <RemeshToolbarButtons
        modelUrl={modelUrl}
        isGenerating={isGenerating}
        isRemeshing={isRemeshing}
        meshyTaskId={meshyTaskId}
        showRemeshSettings={showRemeshSettings}
        setShowRemeshSettings={setShowRemeshSettings}
        handleStopRemesh={handleStopRemesh}
      />
      <UploadToolbarButtons
        modelUrl={modelUrl}
        isGenerating={isGenerating}
        isRemeshing={isRemeshing}
        isUploading={isUploading}
        handleUpload={handleUpload}
        handleStopUpload={handleStopUpload}
      />
    </div>
  )
}
