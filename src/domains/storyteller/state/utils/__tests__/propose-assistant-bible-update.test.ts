import { describe, expect, it } from 'vitest'
import { proposeAssistantBibleUpdate, proposeAssistantBibleUpdates, bibleFieldsFromToolArgs } from '../propose-assistant-bible-update'
import { UPDATE_WORLD_BIBLE_TOOL_ID } from '@/domains/storyteller/ai/tools/manage-tools-wire'
import { ActionType, BibleSection } from '@/domains/storyteller/core/types/enums'
import { CharacterDraftChatSection } from '@/domains/storyteller/core/storyteller-page-wire'

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

  it('proposes Overview for a free-chat worldDescription write', () => {
    const proposal = proposeAssistantBibleUpdate({
      toolName: UPDATE_WORLD_BIBLE_TOOL_ID,
      args: {
        projectId: '0696e553-d361-4a36-a839-fb9c5e570e75',
        worldDescription: 'A salt-marsh city lit by bioluminescent kelp.',
      },
      result: { success: true, updatedFields: ['worldDescription'] },
    })

    expect(proposal?.section).toBe(BibleSection.WORLD_DESCRIPTION)
    expect(proposal?.action.type).toBe(ActionType.UPDATE_WORLD_DESCRIPTION)
    expect(proposal?.preview.worldDescription).toContain('salt-marsh')
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
    expect(proposal?.extraFields?.worldDescription).toBe(
      'Five tracks that sound temporally unstuck.',
    )
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

  it('overlays extras when the write misses the requested section', () => {
    const proposals = proposeAssistantBibleUpdates(
      {
        toolName: UPDATE_WORLD_BIBLE_TOOL_ID,
        args: { plotTwists: [{ title: 'Off target', description: 'Nobody asked.' }] },
        result: { success: true, updatedFields: ['plotTwists'] },
      },
      null,
      BibleSection.SOUNDTRACKS
    )
    expect(proposals.map(proposal => proposal.section)).toEqual([BibleSection.PLOT_TWISTS])
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

  it('overlays soundtrack extras when inspirations was requested but missed', () => {
    const proposals = proposeAssistantBibleUpdates(
      {
        toolName: UPDATE_WORLD_BIBLE_TOOL_ID,
        args: { moodSoundtrack: 'Cigarette-burned jazz.' },
        result: { success: true, updatedFields: ['moodSoundtrack'] },
      },
      null,
      BibleSection.INSPIRATIONS
    )
    expect(proposals.map(proposal => proposal.section)).toEqual([BibleSection.SOUNDTRACKS])
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

  it('returns null when tool-input validation failed', () => {
    expect(
      proposeAssistantBibleUpdate({
        toolName: UPDATE_WORLD_BIBLE_TOOL_ID,
        args: {},
        result: {
          error: true,
          message: 'Tool input validation failed for update_world_bible.',
        },
      })
    ).toBeNull()
  })

  it.each([
    {
      section: BibleSection.WORLD_DESCRIPTION,
      actionType: ActionType.UPDATE_WORLD_DESCRIPTION,
      args: { worldDescription: 'A salt-marsh city lit by bioluminescent kelp.' },
      previewKey: 'worldDescription',
    },
    {
      section: BibleSection.ITEMS,
      actionType: ActionType.UPDATE_ITEMS,
      args: { items: [{ name: 'The Pale Ledger', description: 'A living record of every death.' }] },
      previewKey: 'items',
    },
    {
      section: BibleSection.EVENTS,
      actionType: ActionType.UPDATE_EVENTS,
      args: { events: [{ name: 'The Stillness', description: 'Aging stopped.' }] },
      previewKey: 'events',
    },
    {
      section: BibleSection.FACTIONS,
      actionType: ActionType.UPDATE_FACTIONS,
      args: { factions: [{ name: 'The Ledger Keepers', description: 'They tally every death.' }] },
      previewKey: 'factions',
    },
    {
      section: BibleSection.WORLD_RULES,
      actionType: ActionType.UPDATE_WORLD_RULES,
      args: { worldRules: [{ rule: 'No Natural Death', consequence: 'Only killing ends life.' }] },
      previewKey: 'worldRules',
    },
    {
      section: BibleSection.PLOT_TWISTS,
      actionType: ActionType.UPDATE_PLOT_TWISTS,
      args: { plotTwists: [{ title: 'The clerk wrote her own name.', description: 'She always had.' }] },
      previewKey: 'plotTwists',
    },
    {
      section: BibleSection.SOUNDTRACKS,
      actionType: ActionType.UPDATE_SOUNDTRACKS,
      args: {
        soundtracks: [
          { title: 'Pyramid Song', artist: 'Radiohead', youtubeUrl: 'https://youtu.be/M6W4uhrLA7g' },
        ],
      },
      previewKey: 'soundtracks',
    },
    {
      section: BibleSection.INSPIRATIONS,
      actionType: ActionType.UPDATE_INSPIRATIONS,
      args: {
        inspirations: {
          books: [{ title: 'Dune', description: 'Desert power politics.' }],
          movies: [],
          games: [],
        },
      },
      previewKey: 'inspirations',
    },
    {
      section: BibleSection.EPISODE_ROADMAP,
      actionType: ActionType.UPDATE_EPISODE_ROADMAP,
      args: {
        episodeRoadmap: {
          episodes: [{ title: 'The First Bell', summary: 'A clerk hides a name.' }],
        },
      },
      previewKey: 'episodeRoadmap',
    },
    {
      section: BibleSection.EPISODE_PREMISE,
      actionType: ActionType.UPDATE_EPISODE_PREMISE,
      args: {
        episodePremise: {
          logline: 'A clerk discovers the ledger writes her name in advance.',
        },
      },
      previewKey: 'premise',
    },
  ])('overlays $section when projectId is omitted from tool args', ({
    section,
    actionType,
    args,
    previewKey,
  }) => {
    const field = Object.keys(args)[0]
    const proposal = proposeAssistantBibleUpdate(
      {
        toolName: UPDATE_WORLD_BIBLE_TOOL_ID,
        args,
        result: { success: true, updatedFields: field ? [field] : [] },
      },
      null,
      section,
    )
    expect(proposal?.section).toBe(section)
    expect(proposal?.action.type).toBe(actionType)
    expect(proposal?.preview[previewKey]).toEqual(Object.values(args)[0])
  })

  it('ignores chat wrap-up dumped into worldDescription', () => {
    expect(
      proposeAssistantBibleUpdate({
        toolName: UPDATE_WORLD_BIBLE_TOOL_ID,
        args: {
          worldDescription:
            'I\'ll generate a rich world description.\n\nThe world bible is now live. Here\'s what I built for **Aeternum**.',
        },
        result: { success: true, updatedFields: ['worldDescription'] },
      })
    ).toBeNull()
  })

  it('keeps Overview as the primary overlay when items/events/rules are also written', () => {
    const proposal = proposeAssistantBibleUpdate({
      toolName: UPDATE_WORLD_BIBLE_TOOL_ID,
      args: {
        worldDescription: 'The world of Aeternum is defined by a single impossible fact.',
        items: [{ name: 'The Pale Ledger', description: 'A living record of every death.' }],
        events: [{ name: 'The Stillness', description: 'Aging stopped.' }],
        worldRules: [{ rule: 'No Natural Death', consequence: 'Only killing ends life.' }],
        inspirations: { books: [], movies: [], games: [] },
      },
      result: {
        success: true,
        updatedFields: ['worldDescription', 'items', 'events', 'worldRules'],
      },
    })

    expect(proposal?.section).toBe(BibleSection.WORLD_DESCRIPTION)
    expect(proposal?.action.type).toBe(ActionType.UPDATE_WORLD_DESCRIPTION)
    expect(proposal?.preview.worldDescription).toContain('Aeternum')
  })

  it('puts items, events, and world rules on sibling extras, not Overview preview', () => {
    const proposal = proposeAssistantBibleUpdate({
      toolName: UPDATE_WORLD_BIBLE_TOOL_ID,
      args: {
        worldDescription: 'The world of Aeternum is defined by a single impossible fact.',
        items: [{ name: 'The Pale Ledger', description: 'A living record of every death.' }],
        events: [{ name: 'The Stillness', description: 'Aging stopped.' }],
        worldRules: [{ rule: 'No Natural Death', consequence: 'Only killing ends life.' }],
      },
      result: {
        success: true,
        updatedFields: ['worldDescription', 'items', 'events', 'worldRules'],
      },
    })

    expect(proposal?.preview.items).toBeUndefined()
    expect(proposal?.extraFields?.items).toHaveLength(1)
    expect(proposal?.extraFields?.events).toHaveLength(1)
    expect(proposal?.extraFields?.worldRules).toHaveLength(1)
  })

  it('routes episodePremise writes to the episode premise panel', () => {
    const premise = {
      logline: 'A clerk discovers the ledger writes her name in advance.',
      fatalFlaw: 'She trusts the record more than the living.',
    }
    const proposal = proposeAssistantBibleUpdate({
      toolName: UPDATE_WORLD_BIBLE_TOOL_ID,
      args: { projectId: '0696e553-d361-4a36-a839-fb9c5e570e75', episodePremise: premise },
      result: { success: true, updatedFields: ['episodePremise'] },
    })

    expect(proposal?.section).toBe(BibleSection.EPISODE_PREMISE)
    expect(proposal?.action.type).toBe(ActionType.UPDATE_EPISODE_PREMISE)
    expect(proposal?.preview.premise).toEqual(premise)
  })

  it('splits overview, factions, and plot twists into independent proposals', () => {
    const factions = [{ name: 'The Ledger Keepers', description: 'They tally every death.' }]
    const plotTwists = [{ title: 'The clerk wrote her own name.', description: 'She always had.' }]
    const proposals = proposeAssistantBibleUpdates({
      toolName: UPDATE_WORLD_BIBLE_TOOL_ID,
      args: {
        worldDescription: 'The world of Aeternum is defined by a single impossible fact.',
        factions,
        plotTwists,
      },
      result: {
        success: true,
        updatedFields: ['worldDescription', 'factions', 'plotTwists'],
      },
    })

    expect(proposals.map(proposal => proposal.section)).toEqual([
      BibleSection.WORLD_DESCRIPTION,
      BibleSection.FACTIONS,
      BibleSection.PLOT_TWISTS,
    ])
    expect(proposals[0]?.preview.worldDescription).toContain('Aeternum')
    expect(proposals[0]?.preview.factions).toBeUndefined()
    expect(proposals[1]?.preview.factions).toEqual(factions)
    expect(proposals[2]?.preview.plotTwists).toEqual(plotTwists)
  })

  it('returns no proposals when the turn is character-draft', () => {
    const proposals = proposeAssistantBibleUpdates(
      {
        toolName: UPDATE_WORLD_BIBLE_TOOL_ID,
        args: { worldDescription: 'Bot missing-field ramble overwrites Overview.' },
        result: { success: true, updatedFields: ['worldDescription'] },
      },
      null,
      CharacterDraftChatSection.Form,
    )
    expect(proposals).toEqual([])
  })
})

describe('bibleFieldsFromToolArgs', () => {
  it('omits empty soundtracks so they cannot become an Accept overlay', () => {
    const fields = bibleFieldsFromToolArgs({
      soundtracks: [],
      worldDescription: 'A salt-marsh city lit by bioluminescent kelp.',
    })
    expect(fields.soundtracks).toBeUndefined()
    expect(fields.worldDescription).toContain('salt-marsh')
  })
})
