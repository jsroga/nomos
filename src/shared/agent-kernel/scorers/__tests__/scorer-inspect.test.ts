import { describe, expect, it } from 'vitest'
import { MAGIC_JUDGE_PROMPT } from '../../prompts/registry-evaluation-prompts'
import { registerCorePrompts } from '../../prompts/registry'
import { promptRepository } from '../../prompts/repository'
import { EVAL_PROMPT_DESCRIPTIONS } from '../../prompts/constants/eval-prompt-descriptions'
import { PromptCatalogDomain, PromptCatalogJoin } from '../../prompts/constants/prompt-catalog'
import { STUDIO_AGENT_DESCRIPTION_MAX } from '../../mastra/constants/studio-workspace'
import { compactScorerInput, compactScorerOutput, formatDefaultScorerInspect } from '../scorer-inspect'
import { outputToString } from '../shared'
import { ScorerInspectField, ScorerInspectMarker } from '../constants/inspect'
import { HOUR_LOOP_DEFAULT_SCORERS, HourLoopScorerId, hourLoopExperimentScorerIds, hourLoopScorersForItem } from '../hour-loop-default-scorers'
import { IDEA_DIVERSITY_SCORERS, STORYTELLER_SCORERS } from '../index'
import { ScorerDescriptionBody } from '../constants/scorer-descriptions'
import { evalInstrumentDescription } from '../../prompts/prompt-catalog-copy'
import { readString, recordFromJson } from '@/shared/data/json-guards'

const MAGIC_RUBRIC_MAX_LINES = 30

function studioScorerDescription(scorer: object): string {
  const row = recordFromJson(scorer)
  const direct = readString(row.description)
  if (direct) return direct
  return readString(recordFromJson(row.config).description) ?? ''
}

function scorerInspectAsk(input: unknown): string {
  const message = compactScorerInput(input)[ScorerInspectField.Message]
  return typeof message === 'string' ? message : ''
}

describe('scorer inspect and hour-loop subset', () => {
  it('strips IQ 200 pack and Mastra envelope from default inspect', () => {
    const envelope = {
      inputMessages: [
        {
          role: 'user',
          content: `Ask the warden.\n${ScorerInspectMarker.Iq200}\npacked bible\n${ScorerInspectMarker.SmokeFixture}`,
        },
      ],
      rememberedMessages: [{ role: 'assistant', content: 'prior' }],
      format: 2,
    }
    const inspect = formatDefaultScorerInspect({
      id: 'magic',
      description: 'Creative quality',
      rubric: MAGIC_JUDGE_PROMPT.text,
      excerpt: `${scorerInspectAsk(envelope)}\n${compactScorerOutput(envelope)}`,
    })
    expect(inspect).not.toContain(ScorerInspectMarker.Iq200)
    expect(inspect).not.toContain('inputMessages')
    expect(inspect).not.toContain(ScorerInspectMarker.RememberedMessages)
    expect(outputToString(envelope)).not.toContain(ScorerInspectMarker.SmokeFixture)
    expect(inspect.split('\n').length).toBeLessThan(80)
  })

  it('keeps the magic rubric short and jsonPromptInjection on the judge config', () => {
    expect(MAGIC_JUDGE_PROMPT.text.split('\n').length).toBeLessThanOrEqual(MAGIC_RUBRIC_MAX_LINES)
    expect(MAGIC_JUDGE_PROMPT.description?.length).toBeGreaterThan(0)
  })

  it('registers judge PromptDefinition.description under max length', () => {
    registerCorePrompts()
    const registered = promptRepository.listRegistered()
    for (const name of Object.keys(EVAL_PROMPT_DESCRIPTIONS)) {
      const prompt = registered.find(row => row.name === name)
      expect(prompt, name).toBeDefined()
      expect(prompt?.description?.length).toBeGreaterThan(0)
      expect((prompt?.description ?? '').length).toBeLessThanOrEqual(STUDIO_AGENT_DESCRIPTION_MAX)
      expect(prompt?.description?.startsWith(`${PromptCatalogDomain.Eval}${PromptCatalogJoin.Domain}`)).toBe(
        true,
      )
    }
  })

  it('hour-loop defaults are the craft subset, not every STORYTELLER_SCORERS id', () => {
    expect(HOUR_LOOP_DEFAULT_SCORERS).toEqual([
      HourLoopScorerId.Magic,
      HourLoopScorerId.ProseCraft,
      HourLoopScorerId.StakesCost,
      HourLoopScorerId.StoryMotion,
    ])
    const allIds = Object.keys(STORYTELLER_SCORERS)
    expect(allIds.length).toBeGreaterThan(HOUR_LOOP_DEFAULT_SCORERS.length)
    expect(hourLoopScorersForItem({})).toEqual([...HOUR_LOOP_DEFAULT_SCORERS])
    expect(hourLoopScorersForItem({ facts: ['x'] })).toContain(HourLoopScorerId.Consistency)
    expect(hourLoopScorersForItem({ canon: 'y' })).toContain(HourLoopScorerId.Hallucination)
    expect(hourLoopExperimentScorerIds()).toEqual([
      HourLoopScorerId.Magic,
      HourLoopScorerId.ProseCraft,
      HourLoopScorerId.StakesCost,
      HourLoopScorerId.StoryMotion,
      HourLoopScorerId.Consistency,
      HourLoopScorerId.Hallucination,
    ])
  })

  it('prefixes Studio scorer descriptions with Eval and stays under the Purpose max', () => {
    const prefix = `${PromptCatalogDomain.Eval}${PromptCatalogJoin.Domain}`
    for (const body of Object.values(ScorerDescriptionBody)) {
      const line = evalInstrumentDescription(body)
      expect(line).toBe(`${prefix}${body}`)
      expect(line.length).toBeLessThanOrEqual(STUDIO_AGENT_DESCRIPTION_MAX)
    }
    const registered = [...Object.entries(STORYTELLER_SCORERS), ...IDEA_DIVERSITY_SCORERS.map(scorer => [scorer.id, scorer] as const)]
    for (const [id, scorer] of registered) {
      const description = studioScorerDescription(scorer)
      expect(description.startsWith(prefix), id).toBe(true)
      expect(description.length).toBeLessThanOrEqual(STUDIO_AGENT_DESCRIPTION_MAX)
    }
  })
})
