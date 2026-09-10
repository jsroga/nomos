export const RICH_TEXT_EMPTY_PLACEHOLDER = 'No content'

export enum RichTextContainerTag {
  Span = 'span',
  Div = 'div',
}

export enum RichTextWhitespaceClass {
  PreWrap = 'whitespace-pre-wrap',
  Normal = 'whitespace-normal',
  ParagraphStack = 'space-y-3',
}

const BIBLE_PARAGRAPH_BREAK = /\n\n+/

export function splitBibleParagraphs(text: string): string[] {
  return text.split(BIBLE_PARAGRAPH_BREAK).filter(part => part.trim().length > 0)
}
