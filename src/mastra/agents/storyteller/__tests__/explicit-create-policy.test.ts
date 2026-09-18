import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { FileEncoding } from '@/shared/data/constants/protocol'
import { CHARACTER_TOOL_DESC } from '@/domains/storyteller/ai/tools/manage-tools-wire'

enum PolicyNeedle {
  SameTurn = 'call `manage_character` in the same turn',
  DoNotRefuse = 'Do not refuse because the description contradicts world rules',
  NotContinuityJudge = 'You are not the continuity judge on create',
  CreateEvenWhen = 'call create even if the description contradicts world rules',
  ReplyBudget = '# Reply budget',
  NoUnaskedSoundtracks = 'Do not add soundtracks, inspirations, factions, or other bible sections unless the user asked for them',
  OverviewOnly = 'When the user asked only for world description / Overview',
}

enum OverlayPath {
  File = 'src/mastra/editor/agents/storyteller.json',
}

const INSTRUCTIONS = join(process.cwd(), 'src/mastra/agents/storyteller/instructions.md')

describe('explicit CAST create policy', () => {
  it('pins persist-on-create in the file brief, overlay, and tool description', () => {
    const brief = readFileSync(INSTRUCTIONS, FileEncoding.Utf8)
    const overlay = readFileSync(join(process.cwd(), OverlayPath.File), FileEncoding.Utf8)
    expect(brief).toContain(PolicyNeedle.SameTurn)
    expect(brief).toContain(PolicyNeedle.DoNotRefuse)
    expect(brief).toContain(PolicyNeedle.NotContinuityJudge)
    expect(brief).toContain(PolicyNeedle.ReplyBudget)
    expect(brief).toContain(PolicyNeedle.NoUnaskedSoundtracks)
    expect(brief).toContain(PolicyNeedle.OverviewOnly)
    expect(overlay).toContain(PolicyNeedle.SameTurn)
    expect(overlay).toContain(PolicyNeedle.DoNotRefuse)
    expect(overlay).toContain(PolicyNeedle.ReplyBudget)
    expect(overlay).toContain(PolicyNeedle.NoUnaskedSoundtracks)
    expect(overlay).toContain(PolicyNeedle.OverviewOnly)
    expect(CHARACTER_TOOL_DESC).toContain(PolicyNeedle.CreateEvenWhen)
  })
})
