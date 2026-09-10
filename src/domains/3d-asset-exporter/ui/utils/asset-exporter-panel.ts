/** Shared 2D/3D panel chrome and empty-state tokens. */

export enum AssetExporterPanelCopy {
  TwoDEditor = '2D Editor',
  ThreeDPreview = '3D Preview',
  NoAssetTitle = 'No Asset Selected',
  NoAssetDescription = 'Select an asset from the sidebar to start editing and generating 3D models.',
  NoAssetTip = '💡 Tip: Upload images or export tiles from World Gen to get started',
  NoModelTitle = 'No 3D Model',
  NoModelIdle = 'Select a provider and click Generate to create a 3D model from your 2D asset.',
  NoModelGenerating = 'Generation is running in the background. This may take up to 10 minutes.',
  NoModelRecover = 'Previous generation may have data. Click Recover to check.',
}

export enum AssetExporterPanelClass {
  Header = 'h-[60px] shrink-0 px-3 border-b border-border flex items-center justify-between bg-muted/30',
  PreviewStage = 'flex-1 bg-[#1a1a1a] relative overflow-hidden flex items-center justify-center min-h-0',
  Viewer = 'relative z-10 w-full h-full',
}

export enum AssetExporterEmptyStateClass {
  Checkerboard = 'absolute inset-0 opacity-[0.03] pointer-events-none',
  Card = 'relative z-10 w-full max-w-md mx-4 border-2 border-dashed rounded-xl p-8 transition-all border-muted-foreground/30 bg-background/5',
  Inner = 'flex flex-col items-center gap-4 text-center',
  IconWell = 'w-16 h-16 bg-muted rounded-full flex items-center justify-center',
  Icon = 'text-muted-foreground opacity-50',
  SpinnerIcon = 'animate-spin text-muted-foreground opacity-50',
  Title = 'font-medium text-foreground mb-1',
  Description = 'text-sm text-muted-foreground mb-1',
  Tip = 'text-xs text-muted-foreground mt-1',
}

export function resolveNoModelDescription(isGenerating: boolean, meshyTaskId: string | null): string {
  if (isGenerating) return AssetExporterPanelCopy.NoModelGenerating
  if (meshyTaskId) return AssetExporterPanelCopy.NoModelRecover
  return AssetExporterPanelCopy.NoModelIdle
}
