export {
  CHAT_MODELS,
  type ChatModelOption,
} from './constants/chat-model-catalog'
import { CHAT_MODELS, type ChatModelOption } from './constants/chat-model-catalog'

export const USER_SELECTABLE_CHAT_MODELS: ChatModelOption[] = CHAT_MODELS.filter(
  option => option.userSelectable
)

export const DEFAULT_CHAT_MODEL = 'moonshotai:kimi-k3'

export const CHEAP_TIER_CHAT_MODEL = 'zai-coding-plan:glm-5.2'

const CHAT_MODEL_BY_ID = new Map(CHAT_MODELS.map(model => [model.id, model]))

export function getChatModelOption(id: string): ChatModelOption | undefined {
  return CHAT_MODEL_BY_ID.get(id)
}

export function isKnownChatModel(id: string): boolean {
  return CHAT_MODEL_BY_ID.has(id)
}
