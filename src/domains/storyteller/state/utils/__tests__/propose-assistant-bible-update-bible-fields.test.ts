import { describe, expect, it } from 'vitest'
import { bibleFieldsFromToolArgs } from '../propose-assistant-bible-update'

describe('bibleFieldsFromToolArgs', () => {
  it('omits empty soundtracks so they cannot become an Accept overlay', () => {
    const fields = bibleFieldsFromToolArgs({
      soundtracks: [],
      worldDescription: 'A salt-marsh city lit by bioluminescent kelp.',
    })
    expect(fields.soundtracks).toBeUndefined()
    expect(fields.worldDescription).toContain('salt-marsh')
  })

  it('drops soundtracks with invalid youtube urls', () => {
    const fields = bibleFieldsFromToolArgs({
      soundtracks: [
        { title: 'Ok', artist: 'A', youtubeUrl: 'https://youtu.be/M6W4uhrLA7g' },
        { title: 'Bad', artist: 'B', youtubeUrl: 'https://example.com/x' },
      ],
    })
    expect(fields.soundtracks).toEqual([
      {
        title: 'Ok',
        artist: 'A',
        youtubeUrl: 'https://www.youtube.com/watch?v=M6W4uhrLA7g',
      },
    ])
  })
})
