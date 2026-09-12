import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC_ROOT = 'src'
const GATEWAY = 'src/shared/ai/gateway/index.ts'
const MODELS = 'src/shared/agent-kernel/models.ts'
const MODEL_CONFIG = 'src/domains/storyteller/config/model-config.ts'
const SMOKE = 'src/domains/__tests__/openrouter-smoke.test.ts'
const OUTPUT_BUDGET = 'src/shared/ai/gateway/output-budget.ts'
const JUDGE = 'src/shared/agent-kernel/scorers/shared.ts'

const CREATE_OPENAI_ALLOWED = new Set([GATEWAY, MODELS, MODEL_CONFIG, SMOKE])

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap(entry => {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) {
      if (entry === 'node_modules' || entry === '__tests__') return []
      return filesUnder(path)
    }
    return path.endsWith('.ts') || path.endsWith('.tsx') ? [path] : []
  })
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

describe('output-budget source ratchets', () => {
  it('keeps generateText and generateObject in the gateway', () => {
    const offenders = filesUnder(SRC_ROOT).filter(file => {
      if (file === GATEWAY) return false
      const source = stripComments(readFileSync(file, 'utf8'))
      return /\bgenerateText\s*\(/.test(source) || /\bgenerateObject\s*\(/.test(source)
    })
    expect(offenders).toEqual([])
  })

  it('keeps createOpenAI in gateway, models, getAgentModel, and smoke', () => {
    const offenders = filesUnder(SRC_ROOT).filter(file => {
      if (CREATE_OPENAI_ALLOWED.has(file)) return false
      return /createOpenAI\s*\(/.test(readFileSync(file, 'utf8'))
    })
    expect(offenders).toEqual([])
  })

  it('requires mastraCompletionSettings on domain AI generate/stream call sites', () => {
    const offenders = filesUnder('src/domains').filter(file => {
      if (!file.includes('/ai/')) return false
      const source = stripComments(readFileSync(file, 'utf8'))
      if (!/\.(generate|stream)\s*\(/.test(source)) return false
      return !source.includes('mastraCompletionSettings')
    })
    expect(offenders).toEqual([])
  })

  it('does not bill from wrapLanguageModel', () => {
    const source = readFileSync(OUTPUT_BUDGET, 'utf8')
    expect(source).not.toContain('recordLlmCall')
    expect(source).toContain('wrapLanguageModel')
  })

  it('keeps the judging wrap innermost on an unwrapped chat model', () => {
    const models = readFileSync(MODELS, 'utf8')
    const judge = readFileSync(JUDGE, 'utf8')
    expect(models).toContain('if (chatCompletions) return model')
    expect(judge).toContain('createPureChatModel')
    expect(judge).toContain('wrapLanguageModel')
    expect(judge).not.toMatch(/from ['"]@\/shared\/ai\/gateway['"]/)
    expect(judge).not.toContain('withOpenRouterOutputBudget')
  })
})
