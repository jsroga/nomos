/**
 * Identity-set comparison for the quality ratchet.
 *
 * Counts may only fall. An A/B swap at constant total (added and removed both
 * non-empty, length unchanged) is a hide, not a burn-down. Raising a numeric
 * threshold in the same tree as a new identity is the same hide.
 */

export function diffIdentities(current, baseline) {
  const currentSet = new Set(current)
  const baselineSet = new Set(baseline)
  const added = current.filter(id => !baselineSet.has(id))
  const removed = baseline.filter(id => !currentSet.has(id))
  return { added, removed }
}

export function numericRatchetKeys(json) {
  return Object.keys(json).filter(
    key => key !== '_' && key !== '_commands' && key !== 'baseRef' && typeof json[key] === 'number',
  )
}

export function raisedThresholds(ratchet, baseRatchet) {
  return numericRatchetKeys(ratchet).filter(
    key => typeof baseRatchet[key] === 'number' && ratchet[key] > baseRatchet[key],
  )
}

/**
 * @returns {{ ok: boolean, reason?: string, added: string[], removed: string[], raised: string[] }}
 */
export function evaluateRatchet({ current, baseline, ratchet, baseRatchet }) {
  const { added, removed } = diffIdentities(current, baseline)
  const raised = raisedThresholds(ratchet, baseRatchet)

  if (added.length > 0 && removed.length > 0 && current.length === baseline.length) {
    return { ok: false, reason: 'ab-swap', added, removed, raised }
  }
  if (raised.length > 0 && added.length > 0) {
    return { ok: false, reason: 'raise-and-violate', added, removed, raised }
  }
  return { ok: true, added, removed, raised }
}
