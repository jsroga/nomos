import { describe, expect, it } from 'vitest'
import { proposeAssistantBibleUpdate } from '../propose-assistant-bible-update'
import { UPDATE_WORLD_BIBLE_TOOL_ID } from '@/domains/storyteller/ai/tools/manage-tools-wire'
import { ActionType, BibleSection } from '@/domains/storyteller/core/types/enums'

describe('proposeAssistantBibleUpdate', () => {
  it('proposes Overview only when Overview was the requested section', () => {
    const proposal = proposeAssistantBibleUpdate(
      {
        toolName: UPDATE_WORLD_BIBLE_TOOL_ID,
        args: {
          projectId: '0696e553-d361-4a36-a839-fb9c5e570e75',
          worldDescription: 'A salt-marsh city lit by bioluminescent kelp.',
        },
        result: { success: true, updatedFields: ['worldDescription'] },
      },
      null,
      BibleSection.WORLD_DESCRIPTION
    )

    expect(proposal).not.toBeNull()
    expect(proposal?.section).toBe(BibleSection.WORLD_DESCRIPTION)
    expect(proposal?.action.type).toBe(ActionType.UPDATE_WORLD_DESCRIPTION)
    expect(proposal?.preview.worldDescription).toContain('salt-marsh')
  })

  it('ignores free-chat worldDescription dumps without a panel request', () => {
    expect(
      proposeAssistantBibleUpdate({
        toolName: UPDATE_WORLD_BIBLE_TOOL_ID,
        args: {
          projectId: '0696e553-d361-4a36-a839-fb9c5e570e75',
          worldDescription: 'Done — here are twelve inspirations…',
        },
        result: { success: true, updatedFields: ['worldDescription'] },
      })
    ).toBeNull()
  })

  it('routes a soundtrack write to the soundtrack panel', () => {
    const soundtracks = [
      { title: 'Pyramid Song', artist: 'Radiohead', youtubeUrl: 'https://youtu.be/M6W4uhrLA7g' },
    ]
    const proposal = proposeAssistantBibleUpdate(
      {
        toolName: UPDATE_WORLD_BIBLE_TOOL_ID,
        args: { projectId: '0696e553-d361-4a36-a839-fb9c5e570e75', soundtracks },
        result: { success: true, updatedFields: ['soundtracks'] },
      },
      null,
      BibleSection.SOUNDTRACKS
    )

    expect(proposal?.section).toBe(BibleSection.SOUNDTRACKS)
    expect(proposal?.action.type).toBe(ActionType.UPDATE_SOUNDTRACKS)
    expect(proposal?.preview.soundtracks).toEqual(soundtracks)
  })

  it('prefers soundtracks over worldDescription when both are present', () => {
    const soundtracks = [
      { title: 'A', artist: 'B', youtubeUrl: 'https://youtu.be/M6W4uhrLA7g' },
    ]
    const proposal = proposeAssistantBibleUpdate({
      toolName: UPDATE_WORLD_BIBLE_TOOL_ID,
      args: {
        soundtracks,
        worldDescription: 'Five tracks that sound temporally unstuck.',
      },
      result: { success: true, updatedFields: ['soundtracks', 'worldDescription'] },
    })

    expect(proposal?.section).toBe(BibleSection.SOUNDTRACKS)
    expect(proposal?.preview.worldDescription).toBeUndefined()
    expect(proposal?.preview.soundtracks).toEqual(soundtracks)
  })

  it('keeps an unrequested worldDescription out of a soundtrack request', () => {
    const proposal = proposeAssistantBibleUpdate(
      {
        toolName: UPDATE_WORLD_BIBLE_TOOL_ID,
        args: {
          soundtracks: [{ title: 'A', artist: 'B', youtubeUrl: 'https://youtu.be/M6W4uhrLA7g' }],
          worldDescription: 'Five tracks that sound temporally unstuck.',
        },
        result: { success: true, updatedFields: ['soundtracks', 'worldDescription'] },
      },
      null,
      BibleSection.SOUNDTRACKS
    )

    expect(proposal?.section).toBe(BibleSection.SOUNDTRACKS)
    expect(proposal?.preview.worldDescription).toBeUndefined()
  })

  it('proposes nothing when the write misses the requested section entirely', () => {
    expect(
      proposeAssistantBibleUpdate(
        {
          toolName: UPDATE_WORLD_BIBLE_TOOL_ID,
          args: { plotTwists: [{ title: 'Off target', description: 'Nobody asked.' }] },
          result: { success: true, updatedFields: ['plotTwists'] },
        },
        null,
        BibleSection.SOUNDTRACKS
      )
    ).toBeNull()
  })

  it('routes inspirations writes to the inspirations panel', () => {
    const inspirations = {
      books: [{ title: 'Dune', description: 'Desert power politics.' }],
      movies: [],
      games: [],
    }
    const proposal = proposeAssistantBibleUpdate(
      {
        toolName: UPDATE_WORLD_BIBLE_TOOL_ID,
        args: { projectId: '0696e553-d361-4a36-a839-fb9c5e570e75', inspirations },
        result: { success: true, updatedFields: ['inspirations'] },
      },
      null,
      BibleSection.INSPIRATIONS
    )

    expect(proposal?.section).toBe(BibleSection.INSPIRATIONS)
    expect(proposal?.action.type).toBe(ActionType.UPDATE_INSPIRATIONS)
    expect(proposal?.preview.inspirations).toEqual(inspirations)
  })

  it('rejects moodSoundtrack when the requested section is inspirations', () => {
    expect(
      proposeAssistantBibleUpdate(
        {
          toolName: UPDATE_WORLD_BIBLE_TOOL_ID,
          args: { moodSoundtrack: 'Cigarette-burned jazz.' },
          result: { success: true, updatedFields: ['moodSoundtrack'] },
        },
        null,
        BibleSection.INSPIRATIONS
      )
    ).toBeNull()
  })

  it('surfaces off-section fields as extras when a panel was requested', () => {
    const proposal = proposeAssistantBibleUpdate(
      {
        toolName: UPDATE_WORLD_BIBLE_TOOL_ID,
        args: {
          worldDescription: 'Fresh overview.',
          soundtracks: [
            { title: 'A', artist: 'B', youtubeUrl: 'https://youtu.be/M6W4uhrLA7g' },
          ],
        },
        result: { success: true, updatedFields: ['worldDescription', 'soundtracks'] },
      },
      null,
      BibleSection.WORLD_DESCRIPTION
    )

    expect(proposal?.section).toBe(BibleSection.WORLD_DESCRIPTION)
    expect(proposal?.preview.worldDescription).toBe('Fresh overview.')
    expect(proposal?.preview.soundtracks).toBeUndefined()
    expect(proposal?.extraFields?.soundtracks).toEqual([
      { title: 'A', artist: 'B', youtubeUrl: 'https://youtu.be/M6W4uhrLA7g' },
    ])
  })

  it('returns null when the tool failed', () => {
    expect(
      proposeAssistantBibleUpdate({
        toolName: UPDATE_WORLD_BIBLE_TOOL_ID,
        args: { worldDescription: 'Nope' },
        result: { success: false, error: 'boom' },
      })
    ).toBeNull()
  })
})
