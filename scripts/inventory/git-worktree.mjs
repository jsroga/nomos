import { execFileSync } from 'node:child_process'

/** Vercel `test:unit` has no `.git`. Tests that read history must skip, not throw. */
export function isGitWorkTree() {
  try {
    const out = execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return out.trim() === 'true'
  } catch {
    return false
  }
}
