import { describe, expect, it } from 'vitest'
import {
  AssetExporterSidebarCopy,
  formatExportSelectedLabel,
  formatExportingLabel,
} from '../asset-exporter-sidebar'

describe('asset exporter footer labels', () => {
  it('formats selected and exporting copy', () => {
    expect(formatExportSelectedLabel(2)).toBe(
      `${AssetExporterSidebarCopy.ExportSelectedPrefix} 2 ${AssetExporterSidebarCopy.ExportSelectedSuffix}`,
    )
    expect(formatExportingLabel(2)).toBe(`${AssetExporterSidebarCopy.ExportingPrefix} 2…`)
  })
})
