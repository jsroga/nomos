/** Presentational Writers Room chat chrome — copy and class names only. */

export enum ChatChromeClass {
  Story = 'chat-chrome-story',
  Thread = 'chat-chrome-thread',
  UserRow = 'chat-chrome-user-row',
  UserBubble = 'chat-chrome-user-bubble',
  UserBubbleCurrent = 'chat-chrome-user-bubble--current',
  Assistant = 'chat-chrome-assistant',
  Thought = 'chat-chrome-thought',
  ThoughtToggle = 'chat-chrome-thought-toggle',
  ThoughtChevron = 'chat-chrome-thought-chevron',
  ThoughtChevronOpen = 'chat-chrome-thought-chevron--open',
  ThoughtBody = 'chat-chrome-thought-body',
  Activity = 'chat-chrome-activity',
  ToolCard = 'chat-chrome-tool-card',
  ToolHead = 'chat-chrome-tool-head',
  ToolHeadStatic = 'chat-chrome-tool-head-static',
  ToolTitle = 'chat-chrome-tool-title',
  ToolBody = 'chat-chrome-tool-body',
  ToolDebug = 'chat-chrome-tool-debug',
  ToolRunning = 'chat-chrome-tool-running',
  ToolSpinner = 'chat-chrome-tool-spinner',
  Status = 'chat-chrome-status',
  Body = 'chat-chrome-body',
  Stack = 'chat-chrome-stack',
  ThoughtLive = 'chat-chrome-thought--live',
  ToolCardOpen = 'chat-chrome-tool-card--open',
  StoryBleed = 'chat-chrome-story-bleed',
}

export const CHAT_CHROME_COPY = {
  Thought: 'Thought',
  SecondsSuffix: 's',
  ToolCalledOne: '1 tool was called',
  ToolsCalledRest: 'tools were called',
  ToolDebugPrefix: '🛠 ',
  Running: 'Running',
  Thinking: 'Thinking',
  ShowThought: 'Show thought process',
  HideThought: 'Hide thought process',
  ShowTool: 'Show tool result',
  HideTool: 'Hide tool result',
} as const

export const CHAT_CHROME_TOOL_COUNT_ONE = 1
export const CHAT_CHROME_THOUGHT_MIN_SECONDS = 0
export const CHAT_CHROME_MS_PER_SECOND = 1000
export const CHAT_CHROME_PARAGRAPH_BREAK = '\n\n'
