/** Default thinking indicator messages for chat streaming UI. */

export interface ThinkingMessageStep {
  minSeconds: number
  message: string
}

export interface ThinkingMessagesConfig {
  withAgent: ThinkingMessageStep[]
  fallback: ThinkingMessageStep[]
  completeMessage: string
}

export const THINKING_MSG_ANALYZING = 'Analyzing your request...'
export const THINKING_MSG_THINKING_DEEPLY = 'Thinking deeply...'
export const THINKING_MSG_CRAFTING = 'Crafting response...'
export const THINKING_MSG_COMPLEX_BREWING = 'This is complex, brewing wisdom... ☕'
export const THINKING_MSG_CREATING = 'Creating something amazing... 🎨'
export const THINKING_MSG_DEEP_WORK = 'Deep work in progress... 🧠'
export const THINKING_MSG_PROCESSING = 'Processing...'
export const THINKING_MSG_COMPLEX_COFFEE =
  '☕ Complex request detected. Grab a coffee while I work...'
export const THINKING_MSG_DEEP_MASTERPIECE =
  '🧠 Deep thinking... This one\'s a masterpiece in the making!'
export const THINKING_MSG_COMPLETE = '✨ Complete'

export const DEFAULT_THINKING_MESSAGES: ThinkingMessagesConfig = {
  withAgent: [
    { minSeconds: 0, message: THINKING_MSG_ANALYZING },
    { minSeconds: 3, message: THINKING_MSG_THINKING_DEEPLY },
    { minSeconds: 8, message: THINKING_MSG_CRAFTING },
    { minSeconds: 15, message: THINKING_MSG_COMPLEX_BREWING },
    { minSeconds: 30, message: THINKING_MSG_CREATING },
    { minSeconds: 60, message: THINKING_MSG_DEEP_WORK },
  ],
  fallback: [
    { minSeconds: 0, message: THINKING_MSG_PROCESSING },
    { minSeconds: 15, message: THINKING_MSG_COMPLEX_COFFEE },
    { minSeconds: 30, message: THINKING_MSG_DEEP_MASTERPIECE },
  ],
  completeMessage: THINKING_MSG_COMPLETE,
}

export function getThinkingMessage(
  config: ThinkingMessagesConfig,
  thinkingTime: number,
  hasAgent: boolean
): string {
  const steps = hasAgent ? config.withAgent : config.fallback
  let message = steps[0]?.message || THINKING_MSG_PROCESSING
  for (const step of steps) {
    if (thinkingTime >= step.minSeconds) {
      message = step.message
    } else {
      break
    }
  }
  return message
}
