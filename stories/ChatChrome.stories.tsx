import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  ChatActivityLine,
  ChatAssistantBody,
  ChatAssistantColumn,
  ChatChromeStack,
  ChatChromeStatus,
  ChatThought,
  ChatThreadFrame,
  ChatToolCard,
  ChatUserBubble,
} from '@/shared/chat/ui/ChatChrome'
import {
  CHAT_CHROME_COPY,
  ChatChromeClass,
  formatThoughtDurationLabel,
  formatToolDebugLabel,
  formatToolsCalledLabel,
} from '@/shared/chat/core/utils/chat-chrome'
import '@/shared/chat/ui/ChatChrome/chat-chrome.css'

const THOUGHT_MS = 19000
const TOOL_NAME = 'propose_character_fields'

const PRIOR_USER = 'Generate a rich world description for the storybible.'
const CURRENT_USER = 'Add an interesting new character to the cast.'
const THOUGHT_BODY = [
  'The user asked for Overview only. Call update_world_bible with worldDescription and skip other bible sections.',
  'After the tool returns, they review the draft and click Add to World if it looks right.',
].join('\n\n')

const TOOL_MESSAGE = [
  'Proposed fields for the unsaved character form.',
  'Apply in the dialog to keep them. Nothing is saved to the world yet.',
].join('\n\n')

const DEBUG_JSON = `{\n  "success": true,\n  "message": ${JSON.stringify(TOOL_MESSAGE)}\n}`

const ASSISTANT_LINE =
  'Drafted Overview. Review it, then Add to World when it looks right.'

const meta = {
  title: 'Chat/ChatChrome',
  parameters: { layout: 'fullscreen' },
  decorators: [
    Story => (
      <div className={ChatChromeClass.StoryBleed}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const UserBubbles: Story = {
  render: () => (
    <ChatThreadFrame>
      <ChatUserBubble>{PRIOR_USER}</ChatUserBubble>
      <ChatUserBubble current>{CURRENT_USER}</ChatUserBubble>
    </ChatThreadFrame>
  ),
}

function ThoughtDemo({ startOpen }: { startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen)
  return (
    <ChatThreadFrame>
      <ChatAssistantColumn>
        <ChatThought
          durationLabel={formatThoughtDurationLabel(THOUGHT_MS)}
          text={THOUGHT_BODY}
          open={open}
          onToggle={() => setOpen(value => !value)}
        />
      </ChatAssistantColumn>
    </ChatThreadFrame>
  )
}

export const ThoughtExpanded: Story = {
  render: () => <ThoughtDemo startOpen />,
}

export const ThoughtCollapsed: Story = {
  render: () => <ThoughtDemo startOpen={false} />,
}

export const ActivityLiveAndDone: Story = {
  render: () => (
    <ChatThreadFrame>
      <ChatAssistantColumn>
        <ChatActivityLine>{formatToolsCalledLabel(1)}</ChatActivityLine>
        <ChatActivityLine>{formatToolsCalledLabel(3)}</ChatActivityLine>
      </ChatAssistantColumn>
    </ChatThreadFrame>
  ),
}

function ToolDemo({ startOpen, debug }: { startOpen: boolean; debug: boolean }) {
  const [open, setOpen] = useState(startOpen)
  const title = debug ? formatToolDebugLabel(TOOL_NAME) : CHAT_CHROME_COPY.ToolCalledOne
  return (
    <ChatThreadFrame>
      <ChatAssistantColumn>
        <ChatChromeStack>
          <ChatToolCard
            title={title}
            message={TOOL_MESSAGE}
            debugText={debug ? DEBUG_JSON : undefined}
            open={open}
            onToggle={() => setOpen(value => !value)}
          />
        </ChatChromeStack>
      </ChatAssistantColumn>
    </ChatThreadFrame>
  )
}

export const ToolCompact: Story = {
  render: () => <ToolDemo startOpen debug={false} />,
}

export const ToolDebug: Story = {
  render: () => <ToolDemo startOpen debug />,
}

function FullTurnDemo() {
  const [thoughtOpen, setThoughtOpen] = useState(true)
  const [toolOpen, setToolOpen] = useState(true)
  return (
    <ChatThreadFrame>
      <ChatUserBubble>{PRIOR_USER}</ChatUserBubble>
      <ChatUserBubble current>{CURRENT_USER}</ChatUserBubble>
      <ChatAssistantColumn>
        <ChatThought
          durationLabel={formatThoughtDurationLabel(THOUGHT_MS)}
          text={THOUGHT_BODY}
          open={thoughtOpen}
          onToggle={() => setThoughtOpen(value => !value)}
        />
        <ChatChromeStack>
          <ChatActivityLine>{formatToolsCalledLabel(1)}</ChatActivityLine>
          <ChatToolCard
            title={CHAT_CHROME_COPY.Running}
            message={TOOL_MESSAGE}
            open={toolOpen}
            onToggle={() => setToolOpen(value => !value)}
          />
        </ChatChromeStack>
        <ChatAssistantBody text={ASSISTANT_LINE} />
      </ChatAssistantColumn>
    </ChatThreadFrame>
  )
}

export const FullTurnCursor: Story = {
  render: () => <FullTurnDemo />,
}

export const RunningAndThinking: Story = {
  render: () => (
    <ChatThreadFrame>
      <ChatAssistantColumn>
        <ChatThought
          durationLabel={formatThoughtDurationLabel(THOUGHT_MS)}
          text={THOUGHT_BODY}
          open
          live
          onToggle={() => undefined}
        />
        <ChatChromeStatus>{CHAT_CHROME_COPY.Running}</ChatChromeStatus>
        <ChatChromeStatus>{CHAT_CHROME_COPY.Thinking}</ChatChromeStatus>
      </ChatAssistantColumn>
    </ChatThreadFrame>
  ),
}
