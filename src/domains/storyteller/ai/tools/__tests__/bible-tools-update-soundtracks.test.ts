import { describe, expect, it } from 'vitest'
import {
  BibleToolError,
  proposedFieldsFromInput,
} from '../bible-tools-update'

describe('proposedFieldsFromInput soundtracks', () => {
  it('canonicalizes valid youtube urls', () => {
    const fields = proposedFieldsFromInput({
      soundtracks: [
        { title: 'Theme', artist: 'A', youtubeUrl: 'https://youtu.be/M6W4uhrLA7g' },
      ],
    })
    expect(fields.soundtracks).toEqual([
      {
        title: 'Theme',
        artist: 'A',
        youtubeUrl: 'https://www.youtube.com/watch?v=M6W4uhrLA7g',
      },
    ])
  })

  it('rejects invalid youtube urls', () => {
    expect(() =>
      proposedFieldsFromInput({
        soundtracks: [
          { title: 'Fake', artist: 'B', youtubeUrl: 'https://example.com/not-youtube' },
        ],
      })
    ).toThrow(BibleToolError.InvalidSoundtrackUrls)
  })
})
