'use client'

import { Download, Frame } from 'lucide-react'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import {
  AssetExporterAriaRole,
  AssetExporterSidebarClass,
  AssetExporterSidebarCopy,
  formatExportSelectedLabel,
  formatExportingLabel,
} from './constants/asset-exporter-sidebar'

export interface AssetExporterFooterProps {
  readyCount: number
  selectedCount: number
  hasSelection: boolean
  exportingCount: number | null
  onSelectAll: () => void
  onClearSelection: () => void
  onExport: () => void
}

export function AssetExporterFooter({
  readyCount,
  selectedCount,
  hasSelection,
  exportingCount,
  onSelectAll,
  onClearSelection,
  onExport,
}: AssetExporterFooterProps) {
  const empty = readyCount === 0
  const exporting = exportingCount !== null
  const selectDisabled = empty || exporting
  const exportDisabled = empty || exporting
  const selectLabel = hasSelection
    ? AssetExporterSidebarCopy.ClearSelection
    : AssetExporterSidebarCopy.SelectAll
  const exportLabel = exporting
    ? formatExportingLabel(exportingCount ?? 0)
    : hasSelection
      ? formatExportSelectedLabel(selectedCount)
      : AssetExporterSidebarCopy.ExportAll

  return (
    <div className={AssetExporterSidebarClass.FooterBar}>
      <button
        type={HtmlElementType.Button}
        className={AssetExporterSidebarClass.Ghost}
        disabled={selectDisabled}
        onClick={hasSelection ? onClearSelection : onSelectAll}
      >
        <Frame size={13} strokeWidth={1.7} />
        {selectLabel}
      </button>
      <button
        type={HtmlElementType.Button}
        className={AssetExporterSidebarClass.Export}
        disabled={exportDisabled}
        onClick={onExport}
        role={exporting ? AssetExporterAriaRole.Progressbar : undefined}
        aria-valuenow={exporting ? (exportingCount ?? 0) : undefined}
      >
        {exporting ? (
          <span className={AssetExporterSidebarClass.Spinner} />
        ) : (
          <Download size={13} strokeWidth={1.7} />
        )}
        {exportLabel}
      </button>
    </div>
  )
}
