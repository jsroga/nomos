import { StringSeparator } from '@/shared/data/constants/protocol'
import {
  FollowUpApiframeCopy,
  GenerationPromptCopy,
  TileImageRoleCopy,
  TileImageRoleLabel,
} from '@/shared/data/server/constants/generation-prompts'
import { APIFRAME_GENERATE_PROMPT_MAX_CHARS } from '@/shared/ai/utils/apiframe'

enum GrokPromptBlockKind {
  Subject = 'subject',
  Scene = 'scene',
  Filler = 'filler',
}

interface GrokPromptBlock {
  kind: GrokPromptBlockKind
  text: string
}

const GROK_PROMPT_FILLER_SNIPPETS = [
  FollowUpApiframeCopy.PackedWorld,
  FollowUpApiframeCopy.PackedKeepNeighbors,
  FollowUpApiframeCopy.MatchContract,
  TileImageRoleCopy.StyleTransfer,
  TileImageRoleCopy.RestyleKeepLayout,
  TileImageRoleCopy.FirstTileScene,
]

function joinGrokPromptBlocks(blocks: readonly GrokPromptBlock[]): string {
  return blocks.map(block => block.text).join(StringSeparator.DoubleNewline)
}

function isGrokPromptFiller(block: string): boolean {
  if (block.startsWith(`${TileImageRoleLabel.Image} `)) return true
  if (block.startsWith(GenerationPromptCopy.FollowUpAvoidPrefix)) return true
  return GROK_PROMPT_FILLER_SNIPPETS.some(snippet => block.includes(snippet))
}

function grokPromptBlockKind(block: string): GrokPromptBlockKind {
  if (block.includes(GenerationPromptCopy.TileDescriptionDirectivePrefix)) {
    return GrokPromptBlockKind.Subject
  }
  if (isGrokPromptFiller(block)) return GrokPromptBlockKind.Filler
  return GrokPromptBlockKind.Scene
}

function splitGrokPromptBlocks(prompt: string): GrokPromptBlock[] {
  const blocks: GrokPromptBlock[] = []
  for (const raw of prompt.split(StringSeparator.DoubleNewline)) {
    const text = raw.trim()
    if (text.length === 0) continue
    blocks.push({ kind: grokPromptBlockKind(text), text })
  }
  return blocks
}

function dropFillerBlocksWhileOverBudget(blocks: GrokPromptBlock[], maxChars: number): void {
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    if (joinGrokPromptBlocks(blocks).length <= maxChars) return
    const block = blocks[index]
    if (!block || block.kind !== GrokPromptBlockKind.Filler) continue
    blocks.splice(index, 1)
  }
}

function shrinkSceneBlocksWhileOverBudget(blocks: GrokPromptBlock[], maxChars: number): void {
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const joinedLength = joinGrokPromptBlocks(blocks).length
    if (joinedLength <= maxChars) return
    const block = blocks[index]
    if (!block || block.kind !== GrokPromptBlockKind.Scene) continue
    const overflow = joinedLength - maxChars
    if (overflow >= block.text.length) {
      blocks.splice(index, 1)
      continue
    }
    blocks[index] = { kind: block.kind, text: block.text.slice(0, block.text.length - overflow) }
  }
}

/** Keep the tile subject; drop packing/role copy first, then shrink scene text. */
export function fitGrokGeneratePrompt(
  prompt: string,
  maxChars = APIFRAME_GENERATE_PROMPT_MAX_CHARS,
): string {
  if (prompt.length <= maxChars) return prompt
  const blocks = splitGrokPromptBlocks(prompt)
  if (blocks.length === 0) return prompt.slice(0, maxChars)
  dropFillerBlocksWhileOverBudget(blocks, maxChars)
  const afterFillers = joinGrokPromptBlocks(blocks)
  if (afterFillers.length <= maxChars) return afterFillers
  shrinkSceneBlocksWhileOverBudget(blocks, maxChars)
  const afterScenes = joinGrokPromptBlocks(blocks)
  if (afterScenes.length <= maxChars) return afterScenes
  return afterScenes.slice(0, maxChars)
}
