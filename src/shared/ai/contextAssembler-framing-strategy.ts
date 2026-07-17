type DirectNeighborKey = 'up' | 'down' | 'left' | 'right'
type ContextVariant = 'canonicalFullContext' | 'smartSeamContext'

export interface ContextFramingStrategyResult {
  mode: 'balanced' | 'horizontal_priority' | 'vertical_priority'
  weightedNeighbors: DirectNeighborKey[]
}

const DIRECT_NEIGHBOR_KEYS: readonly DirectNeighborKey[] = ['up', 'down', 'left', 'right']
const HORIZONTAL_NEIGHBOR_KEYS: readonly DirectNeighborKey[] = ['left', 'right']
const VERTICAL_NEIGHBOR_KEYS: readonly DirectNeighborKey[] = ['up', 'down']

export function resolveContextFramingStrategy(
  variant: ContextVariant,
  directNeighbors: Record<DirectNeighborKey, boolean>
): ContextFramingStrategyResult {
  if (variant === 'canonicalFullContext') {
    return {
      mode: 'balanced',
      weightedNeighbors: DIRECT_NEIGHBOR_KEYS.filter(key => directNeighbors[key]),
    }
  }

  const hasHorizontal = directNeighbors.left || directNeighbors.right
  const hasVertical = directNeighbors.up || directNeighbors.down

  if (hasHorizontal && !hasVertical) {
    return {
      mode: 'horizontal_priority',
      weightedNeighbors: HORIZONTAL_NEIGHBOR_KEYS.filter(key => directNeighbors[key]),
    }
  }

  if (hasVertical && !hasHorizontal) {
    return {
      mode: 'vertical_priority',
      weightedNeighbors: VERTICAL_NEIGHBOR_KEYS.filter(key => directNeighbors[key]),
    }
  }

  return {
    mode: 'balanced',
    weightedNeighbors: DIRECT_NEIGHBOR_KEYS.filter(key => directNeighbors[key]),
  }
}
