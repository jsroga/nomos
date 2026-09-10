import { describe, expect, it } from 'vitest'
import {
  AssetExporterPanelCopy,
  resolveNoModelDescription,
} from '../asset-exporter-panel'

describe('resolveNoModelDescription', () => {
  it('returns generating copy while a run is in progress', () => {
    expect(resolveNoModelDescription(true, 'task-1')).toBe(
      AssetExporterPanelCopy.NoModelGenerating,
    )
  })

  it('returns recover copy when a previous task id exists', () => {
    expect(resolveNoModelDescription(false, 'task-1')).toBe(AssetExporterPanelCopy.NoModelRecover)
  })

  it('returns idle copy when nothing has been generated', () => {
    expect(resolveNoModelDescription(false, null)).toBe(AssetExporterPanelCopy.NoModelIdle)
  })
})
