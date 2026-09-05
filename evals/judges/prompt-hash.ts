import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const HASH_ALGORITHM = 'sha256'
const JUDGE_PROMPT_FILE = 'src/shared/agent-kernel/prompts/registry-evaluation-prompts.ts'

export function judgePromptHash(root = process.cwd()): string {
  const bytes = readFileSync(join(root, JUDGE_PROMPT_FILE))
  return createHash(HASH_ALGORITHM).update(bytes).digest('hex')
}
