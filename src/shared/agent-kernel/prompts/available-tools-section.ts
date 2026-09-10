import { PromptSectionHeading } from './constants/prompt-catalog'

enum AvailableToolsCopy {
  MissingDescription = 'No description',
  Bullet = '- ',
  IdSep = ': ',
}

enum AvailableToolsSplit {
  Line = '\n',
}

enum MarkdownHeadingPrefix {
  H2 = '## ',
}

const NEXT_H2 = new RegExp(`^${MarkdownHeadingPrefix.H2}`, 'm')

export interface ToolCatalogRow {
  id: string
  description: string
}

export function toolsToCatalog(
  tools: ReadonlyArray<{ id: string; description?: string }>,
): ToolCatalogRow[] {
  return tools.map(tool => ({
    id: tool.id,
    description: firstLine(tool.description),
  }))
}

function firstLine(description: string | undefined): string {
  if (!description) return AvailableToolsCopy.MissingDescription
  const line = description.split(AvailableToolsSplit.Line)[0]?.trim()
  if (!line) return AvailableToolsCopy.MissingDescription
  return line
}

function renderToolsBlock(tools: ToolCatalogRow[]): string {
  const lines = tools.map(
    tool => `${AvailableToolsCopy.Bullet}${tool.id}${AvailableToolsCopy.IdSep}${tool.description}`,
  )
  return `${PromptSectionHeading.AvailableTools}${AvailableToolsSplit.Line}${lines.join(AvailableToolsSplit.Line)}`
}

/** Replace or append `## Available Tools` so Open Chat cannot advertise missing ids. */
export function replaceAvailableToolsSection(
  instructions: string,
  tools: ReadonlyArray<{ id: string; description?: string }>,
): string {
  const block = renderToolsBlock(toolsToCatalog(tools))
  const heading = PromptSectionHeading.AvailableTools
  const start = instructions.indexOf(heading)
  if (start < 0) {
    return `${instructions.trimEnd()}${AvailableToolsSplit.Line}${AvailableToolsSplit.Line}${block}`
  }
  const before = instructions.slice(0, start).trimEnd()
  const fromHeading = instructions.slice(start)
  const firstBreak = fromHeading.indexOf(AvailableToolsSplit.Line)
  const afterHeadingLine =
    firstBreak < 0 ? '' : fromHeading.slice(firstBreak + AvailableToolsSplit.Line.length)
  const nextRel = afterHeadingLine.search(NEXT_H2)
  const tail = nextRel < 0 ? '' : afterHeadingLine.slice(nextRel).trimStart()
  if (!tail) {
    return `${before}${AvailableToolsSplit.Line}${AvailableToolsSplit.Line}${block}`
  }
  return `${before}${AvailableToolsSplit.Line}${AvailableToolsSplit.Line}${block}${AvailableToolsSplit.Line}${AvailableToolsSplit.Line}${tail}`
}
