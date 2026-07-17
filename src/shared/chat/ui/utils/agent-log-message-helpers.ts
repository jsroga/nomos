import type { Message } from '../../core/types'
import {
  AGENT_DISPLAY_NAMES,
  AGENT_NAME_CAMEL_CASE_SPLIT,
  AGENT_NAME_DELEGATE_PREFIX_PATTERN,
  AGENT_NAME_UNDERSCORE_REPLACEMENT,
  ChatMessageRole,
  ChatSenderAlias,
  DelegationPhrase,
} from '../constants/agent-log'

export function getAgentDisplayName(agentName: string): string {
  if (AGENT_DISPLAY_NAMES[agentName]) {
    return AGENT_DISPLAY_NAMES[agentName]
  }
  const converted = agentName
    .replace(/([A-Z])/g, AGENT_NAME_CAMEL_CASE_SPLIT)
    .replace(/_/g, AGENT_NAME_UNDERSCORE_REPLACEMENT)
    .replace(AGENT_NAME_DELEGATE_PREFIX_PATTERN, '')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
  return converted || agentName
}

export function isDelegationMessage(msg: Message): boolean {
  const content = msg.content?.toLowerCase() || ''
  const sender = (msg.sender || msg.name || '').toLowerCase()

  if (msg.type === ChatMessageRole.Human || sender === ChatSenderAlias.User) {
    return false
  }

  if (content.length > 100 || content.split(' ').length > 15) {
    return false
  }

  if (isHostNarrativeNonTechnical(sender, content)) {
    return false
  }

  return hasDelegationSignals(content, sender)
}

function isHostNarrativeNonTechnical(sender: string, content: string): boolean {
  if (sender !== ChatSenderAlias.Showrunner && sender !== ChatSenderAlias.Supervisor) {
    return false
  }
  return (
    !content.includes(DelegationPhrase.DelegatingTo) &&
    !content.includes(DelegationPhrase.DelegatedTask)
  )
}

function hasDelegationSignals(content: string, sender: string): boolean {
  return (
    content.includes(DelegationPhrase.DelegatingTo) ||
    content.includes(DelegationPhrase.DelegatedTask) ||
    sender.includes(DelegationPhrase.DelegateToPrefix) ||
    sender === ChatSenderAlias.Supervisor ||
    (sender.includes(DelegationPhrase.Delegate) && content.length < 100)
  )
}

export function isPureJsonMessage(msg: Message): boolean {
  const content = msg.content?.trim() || ''
  if (!content.startsWith('{')) return false

  try {
    const parsed = JSON.parse(content)
    if (parsed.message && typeof parsed.message === 'string') return false
    return true
  } catch {
    return false
  }
}
