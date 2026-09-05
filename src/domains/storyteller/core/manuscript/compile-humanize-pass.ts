import type { ClaimCheckResult } from '@/domains/storyteller/core/claim-check'

export enum CompileHumanizeCap {
  Chars = 6_000,
}

export function capCompiledManuscript(compiled: string): string {
  if (compiled.length <= CompileHumanizeCap.Chars) return compiled
  return compiled.slice(0, CompileHumanizeCap.Chars)
}

export async function runCompileHumanizePass(input: {
  compiled: string
  humanize: (draft: string) => Promise<string>
  claimCheck: (source: string, humanized: string) => ClaimCheckResult
}): Promise<{ humanized: string | null; persist: boolean }> {
  const source = capCompiledManuscript(input.compiled)
  if (source.trim().length === 0) {
    return { humanized: null, persist: false }
  }
  const humanized = await input.humanize(source)
  const claim = input.claimCheck(source, humanized)
  if (!claim.ok) {
    return { humanized: null, persist: false }
  }
  return { humanized, persist: true }
}
