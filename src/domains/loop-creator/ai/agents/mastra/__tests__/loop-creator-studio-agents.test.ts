import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  LoopCreatorMastraAgentId,
  loopCreatorRuntimeAgents,
  loopCreatorStudioAgents,
} from '../loop-creator-mastra-agents'
import { MarketAnalystAgentDescription, MarketAnalystAgentId, MARKET_ANALYST_AGENT_INSTRUCTIONS } from '../../../constants/market-analyst-agent-wire'
import { marketAnalystAgent } from '../../market-analyst'
import { marketAnalystTools } from '../../market-analyst/tools-registry'
import { replaceAvailableToolsSection } from '@/shared/agent-kernel/prompts/available-tools-section'
import { PromptCatalogJoin, LoopCreatorPurposeBody, LoopCreatorPurposeSuffix, PromptSectionHeading } from '@/shared/agent-kernel/prompts/constants/prompt-catalog'
import { firstInstructionLine, loopCreatorPurposeDescription } from '@/shared/agent-kernel/prompts/prompt-catalog-copy'
import { STUDIO_AGENT_DESCRIPTION_MAX } from '@/shared/agent-kernel/mastra/constants/studio-workspace'
import { FileEncoding } from '@/shared/data/constants/protocol'

const MASTRA_INDEX = join(process.cwd(), 'src/mastra/index.ts')

describe('Loop Creator Studio convention', () => {
  it('keeps specialists on production and Market Analyst only on Studio', () => {
    expect(Object.keys(loopCreatorStudioAgents)).toEqual([MarketAnalystAgentId.Id])
    expect(loopCreatorStudioAgents[MarketAnalystAgentId.Id]).toBe(marketAnalystAgent)
    for (const id of Object.values(LoopCreatorMastraAgentId)) {
      expect(loopCreatorStudioAgents[id]).toBeUndefined()
      expect(loopCreatorRuntimeAgents[id]).toBeDefined()
    }
    expect(loopCreatorRuntimeAgents[MarketAnalystAgentId.Id]).toBe(marketAnalystAgent)
    const studioSrc = readFileSync(MASTRA_INDEX, FileEncoding.Utf8)
    expect(studioSrc).toContain('loopCreatorStudioAgents')
    expect(studioSrc).not.toContain('...loopCreatorRuntimeAgents')
  })

  it('marks specialist Purpose as internal and under the Studio max', () => {
    for (const id of Object.values(LoopCreatorMastraAgentId)) {
      const description = loopCreatorRuntimeAgents[id]?.getDescription() ?? ''
      expect(description.length).toBeGreaterThan(0)
      expect(description.length).toBeLessThanOrEqual(STUDIO_AGENT_DESCRIPTION_MAX)
      expect(description).toContain(PromptCatalogJoin.Domain)
      expect(description).toContain(LoopCreatorPurposeSuffix.InternalNotStudio.trim())
    }
  })

  it('lists every Market Analyst tool id in Open Chat instructions', () => {
    expect(MarketAnalystAgentDescription.Name).toBe(
      loopCreatorPurposeDescription(LoopCreatorPurposeBody.MarketAnalyst),
    )
    expect(firstInstructionLine(MARKET_ANALYST_AGENT_INSTRUCTIONS)).toBe(MarketAnalystAgentDescription.Name)
    const text = replaceAvailableToolsSection(MARKET_ANALYST_AGENT_INSTRUCTIONS, marketAnalystTools)
    expect(firstInstructionLine(text)).toBe(MarketAnalystAgentDescription.Name)
    expect(text).toContain(PromptSectionHeading.AvailableTools)
    for (const tool of marketAnalystTools) {
      expect(text).toContain(tool.id)
    }
  })
})
