import { CHAT_CHROME_PARAGRAPH_BREAK } from '@/shared/chat/core/utils/chat-chrome'

export function ChatChromeParagraphs({
  text,
  className,
}: {
  text: string
  className: string
}) {
  const blocks = text.split(CHAT_CHROME_PARAGRAPH_BREAK).filter(block => block.trim().length > 0)
  return (
    <div className={className}>
      {blocks.map((block, index) => (
        <p key={`${index}-${block.length}`}>{block}</p>
      ))}
    </div>
  )
}
