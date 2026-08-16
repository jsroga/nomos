import { describe, expect, it } from 'vitest'
import {
  isAssistantChatWrapUp,
  pickWorldDescriptionForBible,
  stripAssistantBibleChatChrome,
  worldDescriptionFromToolArgs,
  episodePremiseFromToolArgs,
} from '../strip-assistant-bible-chat-chrome'

const PREAMBLE =
  'I\'ll generate a rich world description with woven entity links for items, events, and world rules — all created in one world-bible update.'

const CHAT_WRAP_UP = `${PREAMBLE}

The world bible is now live. Here's what I built for **Aeternum** — a world where the only exit from life is through another's hands:

### Core Concept
Seven centuries ago, **The Stillness** froze every living person's biology. No aging, no disease, no natural death. The only way to die is to be killed — and civilization rebuilt itself around that single, terrible fact.

### What was created:

**6 World Rules** — including *No Natural Death*.

Would you like to generate **factions**, **inspirations**, or jump into creating an **episode premise** next?`

const WORLD_PROSE =
  'The world of Aeternum is defined by a single impossible fact: no one has died of old age.'

const LINKED_OVERVIEW =
  'The world of Aeternum is defined by [The Stillness][event-the-stillness] and [The Pale Ledger][item-pale-ledger].'

describe('stripAssistantBibleChatChrome', () => {
  it('drops generate-preamble and live-bible wrap-up', () => {
    const stripped = stripAssistantBibleChatChrome(
      `${PREAMBLE}\n\n${WORLD_PROSE}\n\nThe world bible is now live. Here's what I built.`
    )
    expect(stripped).toBe(WORLD_PROSE)
  })

  it('returns empty for the chat wrap-up that was wrongly saved as Overview', () => {
    expect(stripAssistantBibleChatChrome(CHAT_WRAP_UP)).toBe('')
    expect(isAssistantChatWrapUp(CHAT_WRAP_UP)).toBe(true)
  })

  it('leaves linked world prose unchanged', () => {
    expect(stripAssistantBibleChatChrome(LINKED_OVERVIEW)).toBe(LINKED_OVERVIEW)
    expect(isAssistantChatWrapUp(LINKED_OVERVIEW)).toBe(false)
  })
})

describe('pickWorldDescriptionForBible', () => {
  it('prefers tool worldDescription over chat wrap-up copy', () => {
    expect(
      pickWorldDescriptionForBible([
        worldDescriptionFromToolArgs([{ worldDescription: LINKED_OVERVIEW }]),
        CHAT_WRAP_UP,
      ])
    ).toBe(LINKED_OVERVIEW)
  })

  it('never selects the assistant response as overview', () => {
    expect(pickWorldDescriptionForBible([CHAT_WRAP_UP, PREAMBLE])).toBeUndefined()
  })
})

describe('episodePremiseFromToolArgs', () => {
  it('reads manage_episode data.premise and skips wrap-up fields', () => {
    const premise = {
      logline: 'A clerk discovers the ledger writes her name in advance.',
      fatalFlaw: 'She trusts the record more than the living.',
    }
    expect(
      episodePremiseFromToolArgs([
        {
          operation: 'update',
          data: { title: 'Pilot', premise },
        },
      ]),
    ).toEqual(premise)
  })

  it('ignores wrap-up dumped into episodePremise', () => {
    expect(
      episodePremiseFromToolArgs([
        {
          episodePremise: {
            logline: CHAT_WRAP_UP,
          },
        },
      ]),
    ).toBeUndefined()
  })
})
