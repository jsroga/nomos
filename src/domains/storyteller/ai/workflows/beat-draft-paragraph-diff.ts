import '@/shared/data/server-guard'

/** Cheap paragraph-level diff for style-fidelity review on revise only. */

export enum ParagraphDiffLabel {
  Removed = '- ',
  Added = '+ ',
  Unchanged = '  ',
  Header = 'PARAGRAPH DIFF (revise vs prior draft):',
}

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map(part => part.trim())
    .filter(part => part.length > 0)
}

/**
 * Format removed/added paragraphs. Unchanged paragraphs are listed with a
 * two-space prefix so the critic can see locality without a full LCS.
 */
export function formatParagraphDiff(before: string, after: string): string {
  const left = splitParagraphs(before)
  const right = splitParagraphs(after)
  const rightSet = new Set(right)
  const leftSet = new Set(left)
  const lines: string[] = [ParagraphDiffLabel.Header]

  for (const paragraph of left) {
    if (rightSet.has(paragraph)) {
      lines.push(`${ParagraphDiffLabel.Unchanged}${paragraph}`)
    } else {
      lines.push(`${ParagraphDiffLabel.Removed}${paragraph}`)
    }
  }
  for (const paragraph of right) {
    if (!leftSet.has(paragraph)) {
      lines.push(`${ParagraphDiffLabel.Added}${paragraph}`)
    }
  }

  return lines.join('\n')
}
