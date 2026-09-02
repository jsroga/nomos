/**
 * Resolve the app repo root when Mastra Studio / deployer runs with cwd under
 * `.mastra/output` or `src/mastra/public` (not the monorepo root).
 */

import { env } from '@/shared/config/env'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
  MASTRA_DIR_NAME,
  MASTRA_NESTED_SERVER_PACKAGE,
  NEXT_CONFIG_FILENAME,
  PACKAGE_JSON_FILENAME,
  PACKAGE_JSON_NAME_FIELD,
} from '@/shared/agent-kernel/constants/mastra-bootstrap'
import { FileEncoding } from '@/shared/data/constants/protocol'
import { readString, recordFromJson } from '@/shared/data/json-guards'

export function resolveProjectRoot(): string {
  const envRoot = env.MASTRA_PROJECT_ROOT?.trim()
  if (envRoot) {
    const resolved = path.resolve(envRoot)
    if (path.basename(resolved) === MASTRA_DIR_NAME) {
      return path.dirname(resolved)
    }
    return resolved
  }

  let dir = process.cwd()
  while (true) {
    const pkgPath = path.join(dir, PACKAGE_JSON_FILENAME)
    const isAppRoot =
      existsSync(pkgPath) &&
      existsSync(path.join(dir, NEXT_CONFIG_FILENAME)) &&
      !path.basename(dir).startsWith(MASTRA_DIR_NAME)

    if (isAppRoot) {
      try {
        const pkg: unknown = JSON.parse(readFileSync(pkgPath, FileEncoding.Utf8))
        const pkgName = readString(recordFromJson(pkg)[PACKAGE_JSON_NAME_FIELD])
        if (pkgName !== MASTRA_NESTED_SERVER_PACKAGE) return dir
      } catch {
        return dir
      }
    }

    const parent = path.dirname(dir)
    if (parent === dir) return process.cwd()
    dir = parent
  }
}
