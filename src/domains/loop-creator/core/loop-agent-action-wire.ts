import { readNumber, readRowNumber, readRowString, readString, recordFromJson } from '@/shared/data/json-guards'
import type { LoopAgentActionType } from './graph/state'

export interface MechanicActionPayload {
  id?: string
  name: string
  type?: string
  description?: string
}

export interface ConnectionActionPayload {
  id?: string
  source: string
  target: string
  sourceLabel?: string
  targetLabel?: string
  label?: string
}

export interface AddNodeActionPayload {
  id?: string
  label: string
  description?: string
  nodeType?: string
  position?: { x: number; y: number }
}

export interface IdActionPayload {
  id: string
}

export interface ModifyNodeActionPayload {
  id: string
  updates: Record<string, unknown>
}

export interface LoopStreamStateCounts {
  mechanics: number
  loops: number
}

function parsePosition(value: unknown): { x: number; y: number } | undefined {
  const row = recordFromJson(value)
  const x = readRowNumber(row, 'x')
  const y = readRowNumber(row, 'y')
  if (x === undefined || y === undefined) return undefined
  return { x, y }
}

export function parseMechanicPayload(value: unknown): MechanicActionPayload | undefined {
  const row = recordFromJson(value)
  const name = readRowString(row, 'name')
  if (!name) return undefined
  return {
    id: readRowString(row, 'id'),
    name,
    type: readRowString(row, 'type'),
    description: readRowString(row, 'description'),
  }
}

export function parseConnectionPayload(value: unknown): ConnectionActionPayload | undefined {
  const row = recordFromJson(value)
  const source = readRowString(row, 'source')
  const target = readRowString(row, 'target')
  if (!source || !target) return undefined
  return {
    id: readRowString(row, 'id'),
    source,
    target,
    sourceLabel: readRowString(row, 'sourceLabel'),
    targetLabel: readRowString(row, 'targetLabel'),
    label: readRowString(row, 'label'),
  }
}

export function parseAddNodePayload(value: unknown): AddNodeActionPayload | undefined {
  const row = recordFromJson(value)
  const label = readRowString(row, 'label')
  if (!label) return undefined
  return {
    id: readRowString(row, 'id'),
    label,
    description: readRowString(row, 'description'),
    nodeType: readRowString(row, 'nodeType'),
    position: parsePosition(row.position),
  }
}

export function parseIdPayload(value: unknown): IdActionPayload | undefined {
  const row = recordFromJson(value)
  const id = readRowString(row, 'id')
  if (!id) return undefined
  return { id }
}

export function parseModifyNodePayload(value: unknown): ModifyNodeActionPayload | undefined {
  const row = recordFromJson(value)
  const id = readRowString(row, 'id')
  if (!id) return undefined
  return { id, updates: recordFromJson(row.updates) }
}

export function parseLoopStreamStateCounts(
  data: Record<string, unknown>
): LoopStreamStateCounts | undefined {
  if (readString(data.type) !== 'state') return undefined
  return {
    mechanics: readNumber(data.mechanics) ?? 0,
    loops: readNumber(data.loops) ?? 0,
  }
}

export function parseLoopStreamThreadId(data: Record<string, unknown>): string | undefined {
  if (readString(data.type) !== 'start') return undefined
  return readString(data.threadId)
}

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
