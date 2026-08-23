/**
 * Live tier — reproduces the Writers Room turn at the route level.
 *
 *   npx vitest run src/app/api/assistant/__tests__/assistant-chat-stream.e2e.test.ts
 *
 * Needs OPENROUTER_API_KEY (+ DATABASE_URL for agent memory). Drives
 * `handleChatStream` with the same params `/api/assistant/[agentId]` uses and
 * reports the frame histogram, so an "empty turn" (`count=3`, no text/tool
 * frames) is reproducible here instead of only in a browser session.
 */

import { describe, expect, it } from 'vitest'
import { handleChatStream } from '@mastra/ai-sdk'
import '@/domains/storyteller/core/io/mastra-runtime'
import { getMastraInstance } from '@/shared/agent-kernel/mastra-instance'

const ready = Boolean(process.env.OPENROUTER_API_KEY && process.env.DATABASE_URL)
const AGENT_ID = 'storyteller'
const PROMPT = 'In one sentence, what makes a story premise compelling?'

interface StreamProbe {
  histogram: Record<string, number>
  textLength: number
  frames: number
  elapsedMs: number
}

async function drive(params: Record<string, unknown>, prompt = PROMPT): Promise<StreamProbe> {
  const mastra = getMastraInstance()
  const startedAt = Date.now()
  const stream = await handleChatStream({
    mastra,
    agentId: AGENT_ID,
    version: 'v6',
    params: {
      messages: [
        { id: 'u1', role: 'user', parts: [{ type: 'text', text: prompt }] },
      ],
      toolChoice: 'auto',
      ...params,
    },
    sendStart: false,
    sendFinish: true,
    sendReasoning: false,
  })

  const histogram: Record<string, number> = {}
  let textLength = 0
  let frames = 0
  const reader = stream.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    frames += 1
    const part: Record<string, unknown> = value
    const rawType = part.type
    const type = typeof rawType === 'string' ? rawType : 'unknown'
    histogram[type] = (histogram[type] ?? 0) + 1
    const delta = part.delta
    if (type === 'text-delta' && typeof delta === 'string') textLength += delta.length
  }
  return { histogram, textLength, frames, elapsedMs: Date.now() - startedAt }
}

/** Mirrors the shape/size of the route's assembled world context. */
const SYSTEM_CONTEXT = [
  '=== WORLD CONTEXT ===',
  'The Stillness stopped every biological clock seven centuries ago.',
  '=== OPEN WORKSPACE (authoritative) ===',
  'projectId: "00000000-0000-0000-0000-000000000000"',
  'Use ONLY these IDs for tool calls. Never call workspace filesystem tools.',
  'For GENERATE / REGENERATE world description or bible sections: call update_world_bible immediately with these IDs — do not browse the codebase.',
].join('\n')

const ACTIVE_TOOLS = [
  'manage_beat',
  'list_beats',
  'manage_character',
  'list_characters',
  'manage_episode',
  'list_episodes',
  'update_world_bible',
  'read_world_bible',
  'check_continuity',
  'check_section_alignment',
  'propose_character_fields',
  'run_beat_draft_workflow',
]

describe.skipIf(!ready)('assistant chat stream', () => {
  it('streams renderable text for a plain turn', async () => {
    const probe = await drive({})
    console.log('A plain:', JSON.stringify(probe))
    expect(probe.textLength).toBeGreaterThan(0)
  })

  it('streams renderable text with activeTools restricted', async () => {
    const probe = await drive({ activeTools: ACTIVE_TOOLS })
    console.log('B activeTools:', JSON.stringify(probe))
    expect(probe.textLength).toBeGreaterThan(0)
  })

  it('streams renderable text with the world-context system prompt', async () => {
    const probe = await drive({ system: SYSTEM_CONTEXT })
    console.log('C system:', JSON.stringify(probe))
    expect(probe.textLength).toBeGreaterThan(0)
  })

  it('streams renderable text with the full route param set', async () => {
    const probe = await drive({ system: SYSTEM_CONTEXT, activeTools: ACTIVE_TOOLS })
    console.log('D system+activeTools:', JSON.stringify(probe))
    expect(probe.textLength).toBeGreaterThan(0)
  })

  // The reported failure: a bible-section regenerate, which the system prompt
  // pushes straight at update_world_bible. A turn that emits neither text nor
  // tool frames is the `count=3` empty turn.
  it('emits text or tool frames for a bible regenerate turn', async () => {
    const probe = await drive(
      { system: SYSTEM_CONTEXT, activeTools: ACTIVE_TOOLS },
      'Regenerate the soundtracks for this project.'
    )
    console.log('E regenerate:', JSON.stringify(probe))
    const toolFrames = Object.entries(probe.histogram)
      .filter(([type]) => type.startsWith('tool-'))
      .reduce((sum, [, n]) => sum + n, 0)
    expect(probe.textLength + toolFrames).toBeGreaterThan(0)
  })
})
