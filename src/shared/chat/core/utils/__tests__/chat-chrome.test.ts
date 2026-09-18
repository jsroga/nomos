import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  CHAT_CHROME_COPY,
  CHAT_CHROME_MS_PER_SECOND,
  formatThoughtDurationLabel,
  formatToolDebugLabel,
  formatToolsCalledLabel,
  toolCardBodyMessage,
  uniqueToolNames,
} from '../chat-chrome'

describe('chat chrome copy helpers', () => {
  it('formats Thought Ns from elapsed milliseconds', () => {
    expect(formatThoughtDurationLabel(0)).toBe(
      `${CHAT_CHROME_COPY.Thought} 0${CHAT_CHROME_COPY.SecondsSuffix}`,
    )
    expect(formatThoughtDurationLabel(19 * CHAT_CHROME_MS_PER_SECOND)).toBe(
      `${CHAT_CHROME_COPY.Thought} 19${CHAT_CHROME_COPY.SecondsSuffix}`,
    )
  })

  it('formats one tool vs many tools', () => {
    expect(formatToolsCalledLabel(1)).toBe(CHAT_CHROME_COPY.ToolCalledOne)
    expect(formatToolsCalledLabel(3)).toBe(`3 ${CHAT_CHROME_COPY.ToolsCalledRest}`)
  })

  it('prefixes debug tool names', () => {
    expect(formatToolDebugLabel('propose_character_fields')).toBe(
      `${CHAT_CHROME_COPY.ToolDebugPrefix}propose_character_fields`,
    )
  })

  it('does not echo the accordion title as the tool body', () => {
    const title = formatToolDebugLabel('update_world_bible')
    expect(toolCardBodyMessage(title, null)).toBeUndefined()
    expect(toolCardBodyMessage(title, title)).toBeUndefined()
    expect(toolCardBodyMessage(title, 'Wrote the world description.')).toBe(
      'Wrote the world description.',
    )
  })

  it('does not treat a previous 1-tool activity line as a named tool call', () => {
    const src = readFileSync('e2e/fixtures/storyteller-fixtures.ts', 'utf8')
    expect(src).toContain('ChatChromeClass.ToolTitle')
    expect(src).not.toContain('CHAT_CHROME_COPY.ToolCalledOne')
  })
})

const TOOL_A = 'update_world_bible'
const TOOL_B = 'manage_character'
const TOOL_C = 'list_characters'
const TOOL_D = 'manage_beat'
const TOOL_SET = [TOOL_A, TOOL_B, TOOL_C, TOOL_D] as const

describe('uniqueToolNames', () => {
  it.each(
    TOOL_SET.flatMap(first =>
      TOOL_SET.map(second => ({
        names: [first, first, second, second, first],
        unique: first === second ? [first] : [first, second],
      })),
    ),
  )('dedupes $names → $unique', ({ names, unique }) => {
    expect(uniqueToolNames(names)).toEqual(unique)
    expect(formatToolsCalledLabel(unique.length)).toBe(
      unique.length === 1
        ? CHAT_CHROME_COPY.ToolCalledOne
        : `${unique.length} ${CHAT_CHROME_COPY.ToolsCalledRest}`,
    )
  })

  it.each(
    TOOL_SET.flatMap(first =>
      TOOL_SET.flatMap(second =>
        TOOL_SET.map(third => {
          const names = [first, first, second, third, second, third]
          const unique = [...new Set([first, second, third])]
          return { names, unique }
        }),
      ),
    ),
  )('call+result triples $names → $unique', ({ names, unique }) => {
    expect(uniqueToolNames(names)).toEqual(unique)
  })
})
