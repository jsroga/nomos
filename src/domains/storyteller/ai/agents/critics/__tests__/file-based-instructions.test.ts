import { describe, it, expect } from 'vitest'
import { loadAgentInstructions } from '@/shared/agent-kernel/mastra/load-agent-instructions'
import { CriticAgentId } from '@/domains/storyteller/ai/agents/critics/constants/critic-agents'

// Hybrid file-based agents pilot: the critics' static brief prose lives in
// src/mastra/agents/<id>/instructions.md and is loaded at agent construction.
describe('file-based critic instructions', () => {
  it('loads the continuity brief from instructions.md', () => {
    const md = loadAgentInstructions(CriticAgentId.Continuity)
    expect(md).toContain('continuity checker')
    expect(md).toContain('knowledge they do not possess')
  })

  it('loads the prose brief from instructions.md', () => {
    const md = loadAgentInstructions(CriticAgentId.Prose)
    expect(md).toContain('line-level prose critic')
    expect(md).toContain('POV breaks')
  })

  it('loads the stakes brief from instructions.md', () => {
    const md = loadAgentInstructions(CriticAgentId.Stakes)
    expect(md).toContain('stakes and cost')
    expect(md).toContain('Unearned victories')
  })

  it('trims trailing whitespace so code can append rules cleanly', () => {
    const md = loadAgentInstructions(CriticAgentId.Continuity)
    expect(md).toBe(md.trim())
  })
})
