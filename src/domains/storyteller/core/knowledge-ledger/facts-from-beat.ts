import type { KnowledgeLedgerCanonRow } from './canon-row'

export function ledgerFactsFromApprovedBeat(input: {
  turn: string
  charactersInvolved: readonly string[]
  plotTwistTokens: readonly string[]
}): KnowledgeLedgerCanonRow[] {
  const rows: KnowledgeLedgerCanonRow[] = []
  const turn = input.turn.trim()
  if (turn.length > 0) {
    rows.push({
      factText: turn,
      authorTruth: false,
      knownBy: [...input.charactersInvolved],
    })
  }
  for (const token of input.plotTwistTokens) {
    const factText = token.trim()
    if (factText.length === 0) continue
    rows.push({
      factText,
      authorTruth: true,
      knownBy: [],
    })
  }
  return rows
}
