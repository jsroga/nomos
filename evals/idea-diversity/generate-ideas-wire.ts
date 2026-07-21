import { z } from 'zod'
import ideaPoolsJson from './data/idea-pools.json'
import {
  IdeaAgentId,
  IdeaModelId,
  type IdeaGeneratorSpec,
  type IdeaSet,
} from './types'

const templateSlotSchema = z.object({
  noun: z.string(),
  domain: z.string(),
  role: z.string(),
  verb: z.string(),
  macguffin: z.string(),
})

const ideaPoolsSchema = z.object({
  diversePool: z.array(z.string()).min(4),
  repetitiveBase: z.string().min(8),
  repetitiveEchoSuffix: z.string().min(1),
  defaultPrompt: z.string().min(8),
  template: z.string().min(8),
  templateSlots: z.array(templateSlotSchema).min(4),
})

const IDEA_POOLS = ideaPoolsSchema.parse(ideaPoolsJson)

/** Default brief used by the offline idea-diversity eval. */
export const DEFAULT_IDEA_PROMPT = IDEA_POOLS.defaultPrompt

/** Mulberry32 — deterministic PRNG for seeded fixture agents. */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function fillTemplate(slot: z.infer<typeof templateSlotSchema>): string {
  return IDEA_POOLS.template
    .replace('{noun}', slot.noun)
    .replace('{domain}', slot.domain)
    .replace('{role}', slot.role)
    .replace('{verb}', slot.verb)
    .replace('{macguffin}', slot.macguffin)
}

export const IDEA_GENERATOR_SPECS: readonly IdeaGeneratorSpec[] = [
  {
    agentId: IdeaAgentId.DiverseBrainstormer,
    modelId: IdeaModelId.FixtureDiverse,
    label: `${IdeaAgentId.DiverseBrainstormer} @ ${IdeaModelId.FixtureDiverse}`,
  },
  {
    agentId: IdeaAgentId.RepetitiveEcho,
    modelId: IdeaModelId.FixtureCheap,
    label: `${IdeaAgentId.RepetitiveEcho} @ ${IdeaModelId.FixtureCheap}`,
  },
  {
    agentId: IdeaAgentId.TemplateFiller,
    modelId: IdeaModelId.FixtureTemplate,
    label: `${IdeaAgentId.TemplateFiller} @ ${IdeaModelId.FixtureTemplate}`,
  },
  {
    agentId: IdeaAgentId.SeededSampler,
    modelId: IdeaModelId.FixtureSeeded,
    label: `${IdeaAgentId.SeededSampler} @ ${IdeaModelId.FixtureSeeded}`,
  },
] as const

function generateForSpec(
  spec: IdeaGeneratorSpec,
  prompt: string,
  count: number,
  seed: number
): IdeaSet {
  let ideas: string[]

  switch (spec.agentId) {
    case IdeaAgentId.DiverseBrainstormer: {
      const rng = mulberry32(seed + 11)
      const pool = [...IDEA_POOLS.diversePool]
      const picked: string[] = []
      while (picked.length < count && pool.length > 0) {
        const idx = Math.floor(rng() * pool.length)
        const next = pool.splice(idx, 1)[0]
        if (next) picked.push(next)
      }
      ideas = picked
      break
    }
    case IdeaAgentId.RepetitiveEcho: {
      const base = IDEA_POOLS.repetitiveBase
      const echoSuffix = IDEA_POOLS.repetitiveEchoSuffix
      ideas = Array.from({ length: count }, (_, i) =>
        i % 3 === 0 ? `${base}.` : `${base}${echoSuffix}`
      )
      break
    }
    case IdeaAgentId.TemplateFiller: {
      const slots = IDEA_POOLS.templateSlots
      ideas = Array.from({ length: count }, (_, i) => fillTemplate(slots[i % slots.length]))
      break
    }
    case IdeaAgentId.SeededSampler: {
      const rng = mulberry32(seed + 99)
      const pool = IDEA_POOLS.diversePool
      ideas = Array.from({ length: count }, () => {
        const idx = Math.floor(rng() * pool.length)
        return pool[idx] ?? pool[0]
      })
      break
    }
  }

  return {
    agentId: spec.agentId,
    modelId: spec.modelId,
    label: spec.label,
    prompt,
    ideas,
  }
}

/**
 * Offline stand-ins for “different models and agents”.
 * No network — each agent/model pair yields a fixed personality of idea sets.
 */
export function generateIdeaSets(options: {
  prompt?: string
  count?: number
  seed?: number
  specs?: readonly IdeaGeneratorSpec[]
}): IdeaSet[] {
  const prompt = options.prompt ?? DEFAULT_IDEA_PROMPT
  const count = options.count ?? 8
  const seed = options.seed ?? 42
  const specs = options.specs ?? IDEA_GENERATOR_SPECS
  return specs.map(spec => generateForSpec(spec, prompt, count, seed))
}
