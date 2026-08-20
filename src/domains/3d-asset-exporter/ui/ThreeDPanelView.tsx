'use client'

import dynamic from 'next/dynamic'
import { Box, Loader2 } from 'lucide-react'
import { AIProvider } from '@/shared/types/enums'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import type { MeshyResult } from '../core/types/three-d-generation'
import { MeshyTopology } from '../core/types/three-d-generation'
import { AssetPanelCheckerboard, AssetPanelEmptyState } from './AssetPanelEmptyState'
import {
  AssetExporterPanelClass,
  AssetExporterPanelCopy,
  resolveNoModelDescription,
} from './constants/asset-exporter-panel'
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

      <div className={AssetExporterPanelClass.PreviewStage} id={TOUR_STEP_IDS.ASSET_3D_PREVIEW}>
        <AssetPanelCheckerboard />
        {modelUrl ? (
          <div className={AssetExporterPanelClass.Viewer}>
            <ThreeDViewer modelUrl={showRemeshed && remeshModelUrl ? remeshModelUrl : modelUrl} />
          </div>
        ) : (
          <AssetPanelEmptyState
            icon={Box}
            title={AssetExporterPanelCopy.NoModelTitle}
            description={resolveNoModelDescription(isGenerating, meshyTaskId)}
            isBusy={isGenerating}
          />
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
