export enum PortraitVariantIndex {
  One = 1,
  Two = 2,
  Three = 3,
  Four = 4,
}

export enum PortraitVisionPartType {
  Text = 'text',
  ImageUrl = 'image_url',
}

export enum PortraitVariantCopy {
  Instruction =
    'This is a Midjourney 2x2 grid. 1 is top-left, 2 top-right, 3 bottom-left, 4 bottom-right. Pick the single best character portrait that most closely matches the subject. Reply with one digit: 1, 2, 3, or 4.',
  SubjectLabel = 'Subject:',
}

export enum PortraitVariantLog {
  OpenAiFailed = '[portrait-variant] Fast LLM pick failed; using variant 1',
}

export const PORTRAIT_VARIANT_FALLBACK = PortraitVariantIndex.One

export function isPortraitVariantIndex(value: number): value is PortraitVariantIndex {
  return (
    value === PortraitVariantIndex.One ||
    value === PortraitVariantIndex.Two ||
    value === PortraitVariantIndex.Three ||
    value === PortraitVariantIndex.Four
  )
}

export function parsePortraitVariantIndex(content: string): PortraitVariantIndex {
  const match = /[1-4]/.exec(content)
  if (!match) return PORTRAIT_VARIANT_FALLBACK
  const parsed = Number.parseInt(match[0], 10)
  return isPortraitVariantIndex(parsed) ? parsed : PORTRAIT_VARIANT_FALLBACK
}
