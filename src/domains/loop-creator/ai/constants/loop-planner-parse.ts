import {
  readNumber,
  readRowString,
  readString,
  recordArrayFromJson,
  recordFromJson,
  stringArrayFromJson,
} from '@/shared/data/json-guards'
import { v4 as uuidv4 } from 'uuid'
import type { GameLoop, GameLoopNode } from '../../core/graph/state'

interface LoopPlannerResponse {
  analysis: string
  loops: GameLoop[]
  recommendations: string[]
  message: string
}

const GAME_LOOP_TYPES: GameLoop['type'][] = ['core', 'session', 'meta', 'progression', 'social']
const GAME_LOOP_TYPE_SET = new Set<string>(GAME_LOOP_TYPES)

const GAME_LOOP_TIMEFRAMES: NonNullable<GameLoop['timeframe']>[] = [
  'micro',
  'core',
  'session',
  'meta',
]
const GAME_LOOP_TIMEFRAME_SET = new Set<string>(GAME_LOOP_TIMEFRAMES)

const PSYCH_PHASES: GameLoopNode['psychPhase'][] = ['challenge', 'action', 'feedback']
const PSYCH_PHASE_SET = new Set<string>(PSYCH_PHASES)

function parseGameLoopType(value: unknown): GameLoop['type'] {
  const raw = readString(value)
  if (raw && GAME_LOOP_TYPE_SET.has(raw)) {
    for (const entry of GAME_LOOP_TYPES) {
      if (entry === raw) return entry
    }
  }
  return 'core'
}

function parseGameLoopTimeframe(value: unknown): GameLoop['timeframe'] | undefined {
  const raw = readString(value)
  if (raw && GAME_LOOP_TIMEFRAME_SET.has(raw)) {
    for (const entry of GAME_LOOP_TIMEFRAMES) {
      if (entry === raw) return entry
    }
  }
  return undefined
}

function parsePsychPhase(value: unknown): GameLoopNode['psychPhase'] {
  const raw = readString(value)
  if (raw && PSYCH_PHASE_SET.has(raw)) {
    for (const entry of PSYCH_PHASES) {
      if (entry === raw) return entry
    }
  }
  return 'action'
}

function parseGameLoopNode(value: unknown): GameLoopNode {
  const row = recordFromJson(value)
  return {
    name: readRowString(row, 'name') ?? '',
    psychPhase: parsePsychPhase(row.psychPhase),
    description: readRowString(row, 'description') ?? '',
  }
}

function parseGameLoopDuration(value: unknown): GameLoop['duration'] {
  const row = recordFromJson(value)
  return {
    min: readRowNumber(row, 'min') ?? 1,
    max: readRowNumber(row, 'max') ?? 10,
    typical: readRowNumber(row, 'typical') ?? 5,
    unit: parseDurationUnit(row.unit),
  }
}

function readRowNumber(row: Record<string, unknown>, key: string): number | undefined {
  return readNumber(row[key])
}

function parseDurationUnit(value: unknown): GameLoop['duration']['unit'] | undefined {
  const raw = readString(value)
  if (raw === 'seconds' || raw === 'minutes') return raw
  return undefined
}

function parseGameLoopFromJson(value: unknown): GameLoop {
  const row = recordFromJson(value)
  const type = parseGameLoopType(row.type)
  return {
    id: readRowString(row, 'id') ?? uuidv4(),
    name: readRowString(row, 'name') ?? 'Unnamed Loop',
    type,
    timeframe: parseGameLoopTimeframe(row.timeframe) ?? parseGameLoopTimeframe(type),
    description: readRowString(row, 'description') ?? '',
    mechanics: stringArrayFromJson(row.mechanics),
    duration: parseGameLoopDuration(row.duration),
    playerExperience: readRowString(row, 'playerExperience') ?? '',
    satisfactionPeak: readRowString(row, 'satisfactionPeak') ?? '',
    nodes: recordArrayFromJson(row.nodes).map(parseGameLoopNode),
  }
}

function createFallbackLoops(): GameLoop[] {
  return [
    {
      id: uuidv4(),
      name: 'Core Gameplay Loop',
      type: 'core',
      description: 'Primary moment-to-moment gameplay',
      mechanics: [],
      duration: { min: 1, max: 5, typical: 3 },
      playerExperience: 'Immediate engagement',
      satisfactionPeak: 'Completing micro-objectives',
    },
    {
      id: uuidv4(),
      name: 'Session Loop',
      type: 'session',
      description: 'Goals achievable within a play session',
      mechanics: [],
      duration: { min: 15, max: 45, typical: 30 },
      playerExperience: 'Progress toward larger goals',
      satisfactionPeak: 'Completing missions or levels',
    },
    {
      id: uuidv4(),
      name: 'Meta Progression Loop',
      type: 'meta',
      description: 'Long-term progression across sessions',
      mechanics: [],
      duration: { min: 60, max: 300, typical: 120 },
      playerExperience: 'Character/story advancement',
      satisfactionPeak: 'Major milestones',
    },
  ]
}

export function parseLoopPlannerResponse(content: string): LoopPlannerResponse {
  console.log('[LoopPlanner] Parsing response...')

  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed: unknown = JSON.parse(jsonMatch[0])
      const row = recordFromJson(parsed)
      const loops = recordArrayFromJson(row.loops).map(parseGameLoopFromJson)

      console.log('[LoopPlanner] Successfully parsed JSON')
      console.log(
        `[LoopPlanner] Parsed ${loops.length} loops:`,
        loops.map(loop => loop.name)
      )

      return {
        analysis: readRowString(row, 'analysis') ?? '',
        loops,
        recommendations: stringArrayFromJson(row.recommendations),
        message: readRowString(row, 'message') ?? '',
      }
    } catch (error) {
      console.error('[LoopPlanner] JSON parse error:', error)
      console.error('[LoopPlanner] Raw content:', content.slice(0, 500))
    }
  } else {
    console.error('[LoopPlanner] No JSON found in response!')
    console.error('[LoopPlanner] Raw content:', content.slice(0, 500))
  }

  console.log('[LoopPlanner] Creating fallback loops...')
  return {
    analysis: content,
    loops: createFallbackLoops(),
    recommendations: ['Continue refining the loop structure'],
    message: content,
  }
}

export function comparePsychPhaseNodes(a: GameLoopNode, b: GameLoopNode): number {
  const phaseOrder = PSYCH_PHASES
  const aIdx = phaseOrder.indexOf(a.psychPhase)
  const bIdx = phaseOrder.indexOf(b.psychPhase)
  return aIdx - bIdx
}
