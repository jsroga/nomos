import { execFileSync, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SCRIPT = join(process.cwd(), 'scripts/typecheck-scoped.mjs')
const SAMPLE = 'src/shared/auth/auth.ts'

function runScoped(env: NodeJS.ProcessEnv = process.env): string {
  return execFileSync(process.execPath, [SCRIPT, '--files', SAMPLE], {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
}

describe('typecheck-scoped unique config', () => {
  it('exits non-zero when the tsc binary is missing', () => {
    expect(() =>
      runScoped({
        ...process.env,
        TSC_BIN: join(process.cwd(), 'definitely-missing-tsc'),
      }),
    ).toThrow()
  })

  it('does not share tsconfig.scoped.json across two overlapping runs', async () => {
    const spawnOne = () =>
      new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
        const child = spawn(process.execPath, [SCRIPT, '--files', SAMPLE], {
          cwd: process.cwd(),
          env: process.env,
        })
        let stdout = ''
        let stderr = ''
        child.stdout.on('data', chunk => {
          stdout += String(chunk)
        })
        child.stderr.on('data', chunk => {
          stderr += String(chunk)
        })
        child.on('error', reject)
        child.on('close', code => resolve({ code, stdout, stderr }))
      })

    const [a, b] = await Promise.all([spawnOne(), spawnOne()])
    expect(a.code).toBe(0)
    expect(b.code).toBe(0)
    expect(existsSync(join(process.cwd(), 'tsconfig.scoped.json'))).toBe(false)
  }, 60_000)
})
