/**
 * Effective `no-restricted-imports` on real src paths.
 *
 * Flat config replaces a rule's options when a later block matches the same
 * file. This test fails if compose drops cross-domain, provider, or shared
 * boundary fragments for those paths.
 */

import { createRequire } from 'node:module'
import path from 'node:path'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const {
  composeRestrictedImports,
  crossDomain,
  legacyRoot,
  providerSdk,
  projectAccess,
} = require('../../eslint-rules/restricted-imports-policy.cjs')

const REPO_ROOT = path.resolve(__dirname, '../..')
const STORYTELLER_FILE = 'src/domains/storyteller/ai/workflows/beat-draft-workflow.ts'
const SHARED_GATEWAY_FILE = 'src/shared/ai/gateway/agent.ts'
const APP_STREAM_FILE = 'src/app/api/storyteller/chat/stream/stream-post-handler.ts'
const GENERATE_METRICS_FILE = 'src/app/api/storyteller/generate-metrics/route.ts'

function createRepoEslint(): ESLint {
  return new ESLint({ cwd: REPO_ROOT })
}

async function lintImport(filePath: string, source: string): Promise<string[]> {
  const eslint = createRepoEslint()
  const results = await eslint.lintText(source, { filePath: path.join(REPO_ROOT, filePath) })
  const first = results[0]
  if (!first) return []
  return first.messages
    .filter(message => message.ruleId === 'no-restricted-imports')
    .map(message => message.message)
}

describe('composeRestrictedImports', () => {
  it('omits cross-domain groups when that fragment is stripped', () => {
    const withCross = composeRestrictedImports(
      crossDomain('storyteller'),
      legacyRoot(),
      providerSdk(),
      projectAccess(),
    )
    const withoutCross = composeRestrictedImports(legacyRoot(), providerSdk(), projectAccess())
    const groups = (patterns: Array<{ group?: string[] }> | undefined) =>
      (patterns ?? []).flatMap(pattern => pattern.group ?? [])

    expect(groups(withCross.patterns)).toContain('@/domains/game-design')
    expect(groups(withoutCross.patterns)).not.toContain('@/domains/game-design')
  })
})

describe('effective no-restricted-imports', () => {
  it('keeps the openai provider ban on a real storyteller path', async () => {
    const messages = await lintImport(STORYTELLER_FILE, 'import OpenAI from \'openai\'\n')
    expect(messages.length).toBeGreaterThan(0)
  })

  it('fails closed on a cross-domain barrel import from storyteller', async () => {
    const messages = await lintImport(
      STORYTELLER_FILE,
      'import { x } from \'@/domains/game-design\'\n',
    )
    expect(messages.length).toBeGreaterThan(0)
  })

  it('fails closed on a deep cross-domain import from storyteller', async () => {
    const messages = await lintImport(
      STORYTELLER_FILE,
      'import { x } from \'@/domains/game-design/core/io/foo\'\n',
    )
    expect(messages.length).toBeGreaterThan(0)
  })

  it('fails closed on @/lib from storyteller', async () => {
    const messages = await lintImport(STORYTELLER_FILE, 'import { cn } from \'@/lib/utils\'\n')
    expect(messages.length).toBeGreaterThan(0)
  })

  it('fails closed when shared imports a domain', async () => {
    const messages = await lintImport(
      SHARED_GATEWAY_FILE,
      'import { x } from \'@/domains/storyteller\'\n',
    )
    expect(messages.length).toBeGreaterThan(0)
  })

  it('allows a storyteller core/io import from an app route', async () => {
    const messages = await lintImport(
      APP_STREAM_FILE,
      'import { x } from \'@/domains/storyteller/core/io/mastra-runtime\'\n',
    )
    expect(messages).toEqual([])
  })

  it('allows the storyteller server submodule from an app route', async () => {
    const messages = await lintImport(
      APP_STREAM_FILE,
      'import { x } from \'@/domains/storyteller/server\'\n',
    )
    expect(messages).toEqual([])
  })

  it('allows the 2d-canvas server submodule from an app route', async () => {
    const messages = await lintImport(
      APP_STREAM_FILE,
      'import { x } from \'@/domains/2d-canvas/server\'\n',
    )
    expect(messages).toEqual([])
  })

  it('allows a game-design core/io import from an app route', async () => {
    const messages = await lintImport(
      APP_STREAM_FILE,
      'import { x } from \'@/domains/game-design/core/io/mastra-runtime\'\n',
    )
    expect(messages).toEqual([])
  })

  it('fails closed on a non-seam storyteller deep import from an app route', async () => {
    const messages = await lintImport(
      APP_STREAM_FILE,
      'import { x } from \'@/domains/storyteller/ai/agents/foo\'\n',
    )
    expect(messages.length).toBeGreaterThan(0)
  })

  it('exposes cross-domain patterns on the storyteller file config', async () => {
    const eslint = createRepoEslint()
    const config = await eslint.calculateConfigForFile(path.join(REPO_ROOT, STORYTELLER_FILE))
    const restricted = config.rules?.['no-restricted-imports']
    expect(restricted).toBeDefined()
    const options = Array.isArray(restricted) ? restricted[1] : undefined
    const groups = Array.isArray(options?.patterns)
      ? options.patterns.flatMap((pattern: { group?: string[] }) => pattern.group ?? [])
      : []
    expect(groups).toContain('@/domains/game-design')
  })

  it('fails closed when an app route imports openai directly', async () => {
    const messages = await lintImport(
      GENERATE_METRICS_FILE,
      'import OpenAI from \'openai\'\n',
    )
    expect(messages.length).toBeGreaterThan(0)
    expect(messages.some(message => /OpenRouter|gateway|openai/i.test(message))).toBe(true)
  })
})

describe('local/prefer-await-try-catch', () => {
  it('is wired as error on src files', async () => {
    const eslint = createRepoEslint()
    const config = await eslint.calculateConfigForFile(
      path.join(REPO_ROOT, 'src/shared/data/fetch-json-record.ts')
    )
    const rule = config.rules?.['local/prefer-await-try-catch']
    const severity = Array.isArray(rule) ? rule[0] : rule
    expect(severity === 'error' || severity === 2).toBe(true)
  })

  it('flags .then(callback) and allows await/try-catch', async () => {
    const eslint = createRepoEslint()
    const results = await eslint.lintText(
      'export function load(url: string): Promise<string> {\n  return fetch(url).then(r => r.text())\n}\n',
      { filePath: path.join(REPO_ROOT, 'src/shared/data/fetch-json-record.ts') },
    )
    const hits = (results[0]?.messages ?? []).filter(
      message => message.ruleId === 'local/prefer-await-try-catch'
    )
    expect(hits.length).toBeGreaterThan(0)
  })
})

describe('local/no-functions-in-constants', () => {
  it('is wired as warn on src files', async () => {
    const eslint = createRepoEslint()
    const config = await eslint.calculateConfigForFile(
      path.join(REPO_ROOT, 'src/shared/data/constants/feature-flags.ts')
    )
    const rule = config.rules?.['local/no-functions-in-constants']
    const severity = Array.isArray(rule) ? rule[0] : rule
    expect(severity === 'warn' || severity === 1).toBe(true)
  })

  it('warns on a function under constants/ without failing the lint as an error', async () => {
    const eslint = createRepoEslint()
    const results = await eslint.lintText('export function helper() { return 1 }\n', {
      filePath: path.join(REPO_ROOT, 'src/shared/data/constants/feature-flags.ts'),
    })
    const first = results[0]
    const hits = (first?.messages ?? []).filter(
      message => message.ruleId === 'local/no-functions-in-constants'
    )
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every(message => message.severity === 1)).toBe(true)
  })
})
