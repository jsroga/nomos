import { readString } from '@/shared/data/json-guards'
import type { LoopAgentActionType } from './graph/state'

const LOOP_AGENT_ACTION_TYPES: LoopAgentActionType[] = [
  'ADD_MECHANIC',
  'UPDATE_MECHANIC',
  'DELETE_MECHANIC',
  'ADD_CONNECTION',
  'DELETE_CONNECTION',
  'CREATE_LOOP',
  'UPDATE_LOOP',
  'SET_BALANCE_ANALYSIS',
  'ADD_PROGRESSION_SYSTEM',
  'UPDATE_PROGRESSION_SYSTEM',
  'ASK_USER_QUESTION',
  'ADD_NODE',
  'REMOVE_NODE',
  'REMOVE_ALL_NODES',
  'MODIFY_NODE',
  'ADD_EDGE',
  'REMOVE_EDGE',
  'MODIFY_EDGE',
  'MARKET_ANALYSIS_COMPLETE',
]

const LOOP_AGENT_ACTION_TYPE_SET = new Set<string>(LOOP_AGENT_ACTION_TYPES)

export function parseLoopAgentActionType(value: unknown): LoopAgentActionType | null {
  const raw = readString(value)
  if (!raw || !LOOP_AGENT_ACTION_TYPE_SET.has(raw)) return null
  for (const entry of LOOP_AGENT_ACTION_TYPES) {
    if (entry === raw) return entry
  }
  return null
}
