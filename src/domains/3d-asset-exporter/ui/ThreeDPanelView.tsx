'use client'

import dynamic from 'next/dynamic'
import { Box, Loader2 } from 'lucide-react'
import { AIProvider } from '@/shared/types/enums'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import type { MeshyResult } from '../core/types/three-d-generation'
import { MeshyTopology } from '../core/types/three-d-generation'
import { ThreeDDownloadsSection } from './ThreeDDownloadsSection'
import { ThreeDPanelChrome } from './ThreeDPanelChrome'

const ThreeDViewer = dynamic(
  () => import('./ThreeDViewer').then(mod => ({ default: mod.ThreeDViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    ),
  }
)

export interface ThreeDPanelViewProps {
  modelUrl: string | undefined
  provider: AIProvider
  setProvider: (p: AIProvider) => void
  isGenerating: boolean
  progress: number
  generationResult: MeshyResult | null
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
  remeshModelUrl: string | null
  remeshResult: MeshyResult | null
  showRemeshed: boolean
  setShowRemeshed: (v: boolean) => void
  showRemeshSettings: boolean
  setShowRemeshSettings: (v: boolean) => void
  remeshTopology: MeshyTopology
  setRemeshTopology: (t: MeshyTopology) => void
  remeshPolycount: number
  setRemeshPolycount: (n: number) => void
  remeshHeight: string
  setRemeshHeight: (v: string) => void
  imageUrl: string
  handleRecoverFromMeshy: () => void
  handleGenerate: () => void
  handleDownload: (url: string, filename: string) => void
  handleRegenerate: () => void
  handleStopGeneration: () => void
  handleRemesh: () => void
  handleStopRemesh: () => void
  isUploading: boolean
  uploadProgress: number
  handleUpload: () => void
  handleStopUpload: () => void
}

export function ThreeDPanelView(props: ThreeDPanelViewProps) {
  const {
    modelUrl,
    provider,
    setProvider,
    isGenerating,
    progress,
    generationResult,
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
    remeshModelUrl,
    remeshResult,
    showRemeshed,
    setShowRemeshed,
    showRemeshSettings,
    setShowRemeshSettings,
    remeshTopology,
    setRemeshTopology,
    remeshPolycount,
    setRemeshPolycount,
    remeshHeight,
    setRemeshHeight,
    imageUrl: _imageUrl,
    handleRecoverFromMeshy,
    handleGenerate,
    handleDownload,
    handleRegenerate,
    handleStopGeneration,
    handleRemesh,
    handleStopRemesh,
    isUploading,
    uploadProgress,
    handleUpload,
    handleStopUpload,
  } = props

  return (
<div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden shadow-sm">
      <ThreeDPanelChrome
        modelUrl={modelUrl}
        provider={provider}
        setProvider={setProvider}
        isGenerating={isGenerating}
        progress={progress}
        meshyTaskId={meshyTaskId}
        isRecovering={isRecovering}
        topology={topology}
        setTopology={setTopology}
        targetPolycount={targetPolycount}
        setTargetPolycount={setTargetPolycount}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        isRemeshing={isRemeshing}
        remeshProgress={remeshProgress}
        showRemeshSettings={showRemeshSettings}
        setShowRemeshSettings={setShowRemeshSettings}
        remeshTopology={remeshTopology}
        setRemeshTopology={setRemeshTopology}
        remeshPolycount={remeshPolycount}
        setRemeshPolycount={setRemeshPolycount}
        remeshHeight={remeshHeight}
        setRemeshHeight={setRemeshHeight}
        handleRecoverFromMeshy={handleRecoverFromMeshy}
        handleGenerate={handleGenerate}
        handleStopGeneration={handleStopGeneration}
        handleRemesh={handleRemesh}
        handleStopRemesh={handleStopRemesh}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        handleUpload={handleUpload}
        handleStopUpload={handleStopUpload}
      />

      <div
        className="flex-1 relative bg-[#1a1a1a] flex flex-col items-center justify-center min-h-0"
        id={TOUR_STEP_IDS.ASSET_3D_PREVIEW}
      >
        {modelUrl ? (
          <ThreeDViewer modelUrl={showRemeshed && remeshModelUrl ? remeshModelUrl : modelUrl} />
        ) : (
          <div className="text-center p-8 text-muted-foreground space-y-3">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4 border border-primary/20">
              {isGenerating ? (
                <Loader2 size={36} className="animate-spin text-primary/60" />
              ) : (
                <Box size={36} className="text-primary/60" />
              )}
            </div>
            <h4 className="font-semibold text-lg text-foreground">No 3D Model</h4>
            <p className="text-sm max-w-[240px] mx-auto leading-relaxed">
              {isGenerating
                ? 'Generation is running in the background. This may take up to 10 minutes.'
                : meshyTaskId
                  ? 'Previous generation may have data. Click Recover to check.'
                  : 'Select a provider and click Generate to create a 3D model from your 2D asset.'}
            </p>
          </div>
        )}
      </div>

      {modelUrl && (
        <ThreeDDownloadsSection
          modelUrl={modelUrl}
          remeshModelUrl={remeshModelUrl}
          showRemeshed={showRemeshed}
          setShowRemeshed={setShowRemeshed}
          remeshResult={remeshResult}
          generationResult={generationResult}
          handleDownload={handleDownload}
          handleRegenerate={handleRegenerate}
        />
      )}
    </div>
  )
}
