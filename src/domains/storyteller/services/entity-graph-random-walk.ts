import type { ScoredEntity } from './entity-graph-types'

export function applyRandomWalkScoring(
  entities: ScoredEntity[],
  steps: number,
  restartProb: number,
  seedIds: Set<string>
): void {
  const visitCounts = new Map<string, number>()

  for (const e of entities) {
    visitCounts.set(e.id, 0)
  }

  const seedEntities = entities.filter(e => seedIds.has(e.id))
  if (seedEntities.length === 0) return

  const seedSorted = [...seedIds].sort()
  const seedHash = seedSorted.reduce((h, id) => {
    let v = h
    for (let i = 0; i < id.length; i++) v = (Math.imul(31, v) + id.charCodeAt(i)) | 0
    return v >>> 0
  }, 0)
  let current = seedEntities[seedHash % seedEntities.length]

  let lcgState = seedHash || 1
  const lcgNext = () => {
    lcgState = (Math.imul(1664525, lcgState) + 1013904223) >>> 0
    return lcgState / 0x100000000
  }

  for (let step = 0; step < steps; step++) {
    visitCounts.set(current.id, (visitCounts.get(current.id) || 0) + 1)

    if (lcgNext() < restartProb) {
      current = seedEntities[Math.floor(lcgNext() * seedEntities.length)]
      continue
    }

    const connected = entities.filter(
      e =>
        e.id !== current.id &&
        (e.discoveredVia === current.id ||
          (current.discoveredVia && e.discoveredVia === current.discoveredVia) ||
          Math.abs(e.hopDistance - current.hopDistance) <= 1)
    )

    if (connected.length === 0) {
      current = seedEntities[Math.floor(lcgNext() * seedEntities.length)]
      continue
    }

    const totalRelevance = connected.reduce((sum, e) => sum + e.relevance, 0)
    let rand = lcgNext() * totalRelevance

    let next = connected[connected.length - 1]
    for (const e of connected) {
      rand -= e.relevance
      if (rand <= 0) {
        next = e
        break
      }
    }
    current = next
  }

  const maxVisits = Math.max(...visitCounts.values())
  if (maxVisits > 0) {
    for (const e of entities) {
      const visits = visitCounts.get(e.id) || 0
      const visitBoost = 0.1 * (visits / maxVisits)
      e.relevance = Math.min(1.0, e.relevance + visitBoost)
    }
  }
}
