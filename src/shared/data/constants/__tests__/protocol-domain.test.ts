import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { AppModuleId } from '@/shared/data/constants/protocol'

const SIDEBAR = 'src/components/shell/GlobalSidebar/GlobalSidebar.tsx'
const SIDEBAR_HREF_SEGMENT = '/${projectId}/${AppModuleId.AssetExporter}'

describe('AppModuleId.AssetExporter', () => {
  it('equals the workspace URL segment used by the sidebar', () => {
    expect(AppModuleId.AssetExporter).toBe('asset-exporter')
    const src = readFileSync(SIDEBAR, 'utf8')
    expect(src).toContain(SIDEBAR_HREF_SEGMENT)
  })
})
