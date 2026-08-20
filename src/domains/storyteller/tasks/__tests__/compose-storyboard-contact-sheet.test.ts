import path from 'path'
import { describe, expect, it } from 'vitest'
import { beatImageDiskPath } from '../compose-storyboard-contact-sheet'
import { beatsWithImageUrl } from '../generate-combined-storyboard-helpers'
import {
  CONTACT_SHEET_FRAME_HEIGHT,
  CONTACT_SHEET_FRAME_WIDTH,
  chooseContactSheetGrid,
  contactSheetLayout,
} from '../constants/storyboard-video-sheet'
import { FsDirectory } from '@/shared/data/constants/protocol'

describe('storyboard contact sheet layout', () => {
  it('picks a compact 16:9 grid instead of a fixed column count', () => {
    expect(chooseContactSheetGrid(1)).toMatchObject({ columns: 1, rows: 1 })
    expect(chooseContactSheetGrid(4)).toMatchObject({ columns: 2, rows: 2 })
    expect(chooseContactSheetGrid(5)).toMatchObject({ columns: 3, rows: 2 })
    expect(chooseContactSheetGrid(9)).toMatchObject({ columns: 3, rows: 3 })
  })

  it('places 19 beats in reading order on the densest 16:9 grid', () => {
    const layout = contactSheetLayout(19)
    expect(layout.columns).toBe(5)
    expect(layout.rows).toBe(4)
    expect(layout.cells).toHaveLength(19)
    const seventh = layout.cells[layout.columns]
    const first = layout.cells[0]
    expect(seventh?.left).toBe(first?.left)
    expect(seventh?.top).toBeGreaterThan(first?.top ?? 0)
  })

  it('keeps 16:9 rectangular cells so beat stills are not cropped', () => {
    const layout = contactSheetLayout(5)
    expect(layout.width).toBe(CONTACT_SHEET_FRAME_WIDTH)
    expect(layout.height).toBe(CONTACT_SHEET_FRAME_HEIGHT)
    expect(layout.columns).toBe(3)
    expect(layout.rows).toBe(2)
    for (const cell of layout.cells) {
      expect(cell.width / cell.height).toBeCloseTo(
        CONTACT_SHEET_FRAME_WIDTH / CONTACT_SHEET_FRAME_HEIGHT,
        2,
      )
    }
    expect(layout.cells[0]?.height).toBeGreaterThan(CONTACT_SHEET_FRAME_HEIGHT / 4)
  })

  it('drops beats without an imageUrl', () => {
    const imaged = beatsWithImageUrl([
      { logline: 'one', imageUrl: 'https://cdn.example/1.png' },
      { logline: 'two' },
      { logline: 'three', imageUrl: 'https://cdn.example/3.png' },
    ])
    expect(imaged.map(beat => beat.logline)).toEqual(['one', 'three'])
  })

  it('resolves bare filenames under public/projects/{projectId}', () => {
    const diskPath = beatImageDiskPath('proj-1', 'storyboard_beat_1.png')
    expect(diskPath).toBe(
      path.join(
        process.cwd(),
        FsDirectory.Public,
        FsDirectory.Projects,
        'proj-1',
        'storyboard_beat_1.png',
      ),
    )
  })

  it('resolves /projects/... paths under public/', () => {
    const diskPath = beatImageDiskPath('proj-1', '/projects/proj-1/storyboard_beat_1.png')
    expect(diskPath).toBe(
      path.join(
        process.cwd(),
        FsDirectory.Public,
        FsDirectory.Projects,
        'proj-1',
        'storyboard_beat_1.png',
      ),
    )
  })
})
