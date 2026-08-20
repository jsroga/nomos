'use client'

import React from 'react'
import { Box, Layers, Upload } from 'lucide-react'
import { AIProvider } from '@/shared/types/enums'
import { MeshyTopology } from '../core/types/three-d-generation'
import { AssetExporterPanelClass, AssetExporterPanelCopy } from './constants/asset-exporter-panel'
import { ThreeDGenerationSettings, ThreeDRemeshSettings } from './ThreeDSettingsPanels'
import { ThreeDToolbarActions } from './ThreeDToolbarActions'

export interface ThreeDPanelChromeProps {
  modelUrl: string | undefined
  provider: AIProvider
  setProvider: (p: AIProvider) => void
  isGenerating: boolean
  progress: number
  meshyTaskId: string | null
  isRecovering: boolean
  topology: MeshyTopology
  setTopology: (t: MeshyTopology) => void
  targetPolycount: number
  setTargetPolycount: (n: number) => void
  showSettings: boolean
  setShowSettings: (v: boolean) => void
  isRemeshing: boolean
  remeshProgress: number
  showRemeshSettings: boolean
  setShowRemeshSettings: (v: boolean) => void
  remeshTopology: MeshyTopology
  setRemeshTopology: (t: MeshyTopology) => void
  remeshPolycount: number
  setRemeshPolycount: (n: number) => void
  remeshHeight: string
  setRemeshHeight: (v: string) => void
  handleRecoverFromMeshy: () => void
  handleGenerate: () => void
  handleStopGeneration: () => void
  handleRemesh: () => void
  handleStopRemesh: () => void
  isUploading: boolean
  uploadProgress: number
  handleUpload: () => void
  handleStopUpload: () => void
}

function ProgressBar(props: {
  label: string
  progress: number
  accentClass: string
  icon?: React.ReactNode
}) {
  return (
    <div className={`px-3 py-2 border-b border-border ${props.accentClass}`}>
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
        <span className="flex items-center gap-1">
          {props.icon}
          {props.label}
        </span>
        <span>{props.progress}%</span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            props.icon ? 'bg-blue-500' : 'bg-primary'
          }`}
          style={{ width: `${props.progress}%` }}
        />
      </div>
    </div>
  )
}

export function ThreeDPanelChrome(props: ThreeDPanelChromeProps) {
  const {
    modelUrl,
    provider,
    setProvider,
    isGenerating,
    progress,
    meshyTaskId,
    isRecovering,
    topology,
    setTopology,
    targetPolycount,
    setTargetPolycount,
    showSettings,
    setShowSettings,
    isRemeshing,
    remeshProgress,
    showRemeshSettings,
    setShowRemeshSettings,
    remeshTopology,
    setRemeshTopology,
    remeshPolycount,
    setRemeshPolycount,
    remeshHeight,
    setRemeshHeight,
    handleRecoverFromMeshy,
    handleGenerate,
    handleStopGeneration,
    handleRemesh,
    handleStopRemesh,
    isUploading,
    uploadProgress,
    handleUpload,
    handleStopUpload,
  } = props

  return (
    <>
      <div className={AssetExporterPanelClass.Header}>
        <div className="flex items-center gap-2">
          <Box size={16} className="text-muted-foreground" />
          <h3 className="font-medium text-sm">{AssetExporterPanelCopy.ThreeDPreview}</h3>
        </div>
        <ThreeDToolbarActions
          modelUrl={modelUrl}
          provider={provider}
          setProvider={setProvider}
          isGenerating={isGenerating}
          meshyTaskId={meshyTaskId}
          isRecovering={isRecovering}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          isRemeshing={isRemeshing}
          showRemeshSettings={showRemeshSettings}
          setShowRemeshSettings={setShowRemeshSettings}
          handleRecoverFromMeshy={handleRecoverFromMeshy}
          handleGenerate={handleGenerate}
          handleStopGeneration={handleStopGeneration}
          handleStopRemesh={handleStopRemesh}
          isUploading={isUploading}
          handleUpload={handleUpload}
          handleStopUpload={handleStopUpload}
        />
      </div>

      <ThreeDGenerationSettings
        showSettings={showSettings}
        modelUrl={modelUrl}
        isGenerating={isGenerating}
        provider={provider}
        topology={topology}
        setTopology={setTopology}
        targetPolycount={targetPolycount}
        setTargetPolycount={setTargetPolycount}
      />

      {isGenerating && (
        <ProgressBar label="Generating 3D model..." progress={progress} accentClass="bg-muted/20" />
      )}

      <ThreeDRemeshSettings
        showRemeshSettings={showRemeshSettings}
        modelUrl={modelUrl}
        isRemeshing={isRemeshing}
        remeshTopology={remeshTopology}
        setRemeshTopology={setRemeshTopology}
        remeshPolycount={remeshPolycount}
        setRemeshPolycount={setRemeshPolycount}
        remeshHeight={remeshHeight}
        setRemeshHeight={setRemeshHeight}
        handleRemesh={handleRemesh}
      />

      {isRemeshing && (
        <ProgressBar
          label="Remeshing 3D model..."
          progress={remeshProgress}
          accentClass="bg-blue-500/10"
          icon={<Layers size={12} className="text-blue-400" />}
        />
      )}

      {isUploading && (
        <ProgressBar
          label="Uploading to Vercel Blob..."
          progress={uploadProgress}
          accentClass="bg-muted/20"
          icon={<Upload size={12} className="text-muted-foreground" />}
        />
      )}
    </>
  )
}
