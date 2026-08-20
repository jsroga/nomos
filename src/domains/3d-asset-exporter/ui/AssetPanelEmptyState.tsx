import type { LucideIcon } from 'lucide-react'
import { Loader2 } from 'lucide-react'
import { ASSET_EDITOR_CHECKERBOARD_BACKGROUND_STYLE } from '../constants/asset-editor'
import { AssetExporterEmptyStateClass } from './constants/asset-exporter-panel'

export function AssetPanelCheckerboard() {
  return (
    <div
      className={AssetExporterEmptyStateClass.Checkerboard}
      style={ASSET_EDITOR_CHECKERBOARD_BACKGROUND_STYLE}
    />
  )
}

interface AssetPanelEmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  tip?: string
  isBusy?: boolean
}

export function AssetPanelEmptyState({
  icon: Icon,
  title,
  description,
  tip,
  isBusy = false,
}: AssetPanelEmptyStateProps) {
  return (
    <div className={AssetExporterEmptyStateClass.Card}>
      <div className={AssetExporterEmptyStateClass.Inner}>
        <div className={AssetExporterEmptyStateClass.IconWell}>
          {isBusy ? (
            <Loader2 size={32} className={AssetExporterEmptyStateClass.SpinnerIcon} />
          ) : (
            <Icon size={32} className={AssetExporterEmptyStateClass.Icon} />
          )}
        </div>
        <div>
          <h4 className={AssetExporterEmptyStateClass.Title}>{title}</h4>
          <p className={AssetExporterEmptyStateClass.Description}>{description}</p>
          {tip ? <p className={AssetExporterEmptyStateClass.Tip}>{tip}</p> : null}
        </div>
      </div>
    </div>
  )
}
