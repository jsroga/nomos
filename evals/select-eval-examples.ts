interface ExampleWithScorers {
  metadata: { scorers?: readonly string[] }
}

export function examplesMatchingScorers<T extends ExampleWithScorers>(
  examples: readonly T[],
  scorerIds: readonly string[] | undefined,
): T[] {
  if (!scorerIds || scorerIds.length === 0) return [...examples]
  return examples.filter(example => {
    const allowed = example.metadata.scorers
    if (!allowed?.length) return true
    return allowed.some(id => scorerIds.includes(id))
  })
}
