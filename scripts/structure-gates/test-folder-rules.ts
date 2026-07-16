import fs from 'node:fs'
import path from 'node:path'

/** Vitest / Playwright-style test filenames allowed inside __tests__/ folders. */
export const TEST_FILE_PATTERN = /\.(?:test|spec)\.(?:ts|tsx)$/

export function findNonTestFilesInTestDirs(rootDir: string): string[] {
  const offenders: string[] = []

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      if (entry.name === 'node_modules' || entry.name === '.next') continue

      const fullPath = path.join(dir, entry.name)

      if (entry.name === '__tests__') {
        for (const child of fs.readdirSync(fullPath, { withFileTypes: true })) {
          const childPath = path.join(fullPath, child.name)
          if (child.isDirectory()) {
            offenders.push(path.relative(rootDir, childPath))
            continue
          }
          if (!TEST_FILE_PATTERN.test(child.name)) {
            offenders.push(path.relative(rootDir, childPath))
          }
        }
        continue
      }

      walk(fullPath)
    }
  }

  walk(rootDir)
  return offenders.sort()
}
