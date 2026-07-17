import { describe, it, expect } from 'vitest'
import { loadAgentInstructions } from '@/shared/agent-kernel/mastra/load-agent-instructions'

// The Muse agents' fully-static prompts live in src/mastra/agents/<id>/instructions.md.
const MUSE_ID = 'muse'
const RANKER_ID = 'muse-ranker'

describe('file-based Muse instructions', () => {
  it('loads the blank-context Muse brief', () => {
    const md = loadAgentInstructions(MUSE_ID)
    expect(md).toContain('WILD but CONCRETE story ideas')
    expect(md).toContain('Every idea is an ACTION')
  })

  it('loads the ranker scoring discipline', () => {
    const md = loadAgentInstructions(RANKER_ID)
    expect(md).toContain('judge story ideas coldly')
    expect(md).toContain('storyMotion is the king criterion')
  })
})
