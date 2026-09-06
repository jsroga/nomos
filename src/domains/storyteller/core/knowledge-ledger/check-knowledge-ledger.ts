import type { KnowledgeLedgerCanonRow } from './canon-row'

export function checkKnowledgeLedgerLeak(
  draft: string,
  rows: readonly KnowledgeLedgerCanonRow[],
  povNames: readonly string[]
): string[] {
  const haystack = draft.toLowerCase()
  const pov = new Set(povNames.map(name => name.toLowerCase()))
  const hits: string[] = []
  for (const row of rows) {
    if (row.revoked) continue
    if (!haystack.includes(row.factText.toLowerCase())) continue
    const knownToPov = row.knownBy.some(name => pov.has(name.toLowerCase()))
    if (!knownToPov) hits.push(row.factText)
  }
  return hits
}
