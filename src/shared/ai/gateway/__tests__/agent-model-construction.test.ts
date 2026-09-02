/**
 * Mastra agents take their model from a resolver, never by constructing one.
 *
 * The resolvers all run the same precedence chain in
 * `shared/ai/gateway/model-registry.ts`, so this is what keeps "which model
 * does this agent actually use" answerable from one place. An agent that
 * builds its own client is outside that chain and outside the price table.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const AGENT_DIRECTORIES = [
  'src/domains/storyteller/ai/agents',
  'src/domains/game-design/ai/agents',
  'src/domains/loop-creator/ai/agents',
]

/** Constructing a provider client, as opposed to naming a model. */
const DIRECT_CONSTRUCTION = [/new OpenAI\(/, /createOpenAI\(/, /new ChatOpenAI\(/]

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap(entry => {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) return filesUnder(path)
    return path.endsWith('.ts') && !path.includes('__tests__') ? [path] : []
  })
}

describe('agent model construction', () => {
  it('goes through a resolver in every domain', () => {
    const offenders = AGENT_DIRECTORIES.flatMap(filesUnder).filter(file => {
      const source = readFileSync(file, 'utf8')
      return DIRECT_CONSTRUCTION.some(pattern => pattern.test(source))
    })

    expect(offenders).toEqual([])
  })
})
