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
import {
  LOOP_PLANNER_FALLBACK_LOOPS,
  LOOP_PLANNER_PSYCH_PHASES,
  LOOP_PLANNER_TYPES,
  LoopPlannerCopy,
  LoopPlannerDurationUnit,
  LoopPlannerJsonKey,
  LoopPlannerLoopType,
  LoopPlannerPsychPhase,
  LoopPlannerTimeframe,
} from '../constants/loop-planner-parse'

interface LoopPlannerResponse {
  analysis: string
  loops: GameLoop[]
  recommendations: string[]
  message: string
}

const GAME_LOOP_TYPE_SET = new Set<string>(LOOP_PLANNER_TYPES)
const PSYCH_PHASE_SET = new Set<string>(LOOP_PLANNER_PSYCH_PHASES)

function parseGameLoopType(value: unknown): GameLoop['type'] {
  const raw = readString(value)
  if (raw && GAME_LOOP_TYPE_SET.has(raw)) {
    for (const entry of LOOP_PLANNER_TYPES) {
      if (entry === raw) return entry
    }
  }
  return LoopPlannerLoopType.Core
}

function parseGameLoopTimeframe(value: unknown): GameLoop['timeframe'] | undefined {
  const raw = readString(value)
  if (raw === LoopPlannerTimeframe.Micro) return LoopPlannerTimeframe.Micro
  if (raw === LoopPlannerTimeframe.Core) return LoopPlannerTimeframe.Core
  if (raw === LoopPlannerTimeframe.Session) return LoopPlannerTimeframe.Session
  if (raw === LoopPlannerTimeframe.Meta) return LoopPlannerTimeframe.Meta
  return undefined
}

function parsePsychPhase(value: unknown): GameLoopNode['psychPhase'] {
  const raw = readString(value)
  if (raw && PSYCH_PHASE_SET.has(raw)) {
    for (const entry of LOOP_PLANNER_PSYCH_PHASES) {
      if (entry === raw) return entry
    }
  }
  return LoopPlannerPsychPhase.Action
}

function parseGameLoopNode(value: unknown): GameLoopNode {
  const row = recordFromJson(value)
  return {
    name: readRowString(row, LoopPlannerJsonKey.Name) ?? '',
    psychPhase: parsePsychPhase(row[LoopPlannerJsonKey.PsychPhase]),
    description: readRowString(row, LoopPlannerJsonKey.Description) ?? '',
  }
}

function parseGameLoopDuration(value: unknown): GameLoop['duration'] {
  const row = recordFromJson(value)
  return {
    min: readRowNumber(row, LoopPlannerJsonKey.Min) ?? 1,
    max: readRowNumber(row, LoopPlannerJsonKey.Max) ?? 10,
    typical: readRowNumber(row, LoopPlannerJsonKey.Typical) ?? 5,
    unit: parseDurationUnit(row[LoopPlannerJsonKey.Unit]),
  }
}

function readRowNumber(row: Record<string, unknown>, key: string): number | undefined {
  return readNumber(row[key])
}

function parseDurationUnit(value: unknown): GameLoop['duration']['unit'] | undefined {
  const raw = readString(value)
  if (raw === LoopPlannerDurationUnit.Seconds || raw === LoopPlannerDurationUnit.Minutes) {
    return raw
  }
  return undefined
}

function parseGameLoopFromJson(value: unknown): GameLoop {
  const row = recordFromJson(value)
  const type = parseGameLoopType(row[LoopPlannerJsonKey.Type])
  return {
    id: readRowString(row, LoopPlannerJsonKey.Id) ?? uuidv4(),
    name: readRowString(row, LoopPlannerJsonKey.Name) ?? LoopPlannerCopy.UnnamedLoop,
    type,
    timeframe:
      parseGameLoopTimeframe(row[LoopPlannerJsonKey.Timeframe]) ?? parseGameLoopTimeframe(type),
    description: readRowString(row, LoopPlannerJsonKey.Description) ?? '',
    mechanics: stringArrayFromJson(row[LoopPlannerJsonKey.Mechanics]),
    duration: parseGameLoopDuration(row[LoopPlannerJsonKey.Duration]),
    playerExperience: readRowString(row, LoopPlannerJsonKey.PlayerExperience) ?? '',
    satisfactionPeak: readRowString(row, LoopPlannerJsonKey.SatisfactionPeak) ?? '',
    nodes: recordArrayFromJson(row[LoopPlannerJsonKey.Nodes]).map(parseGameLoopNode),
  }
}

function createFallbackLoops(): GameLoop[] {
  return LOOP_PLANNER_FALLBACK_LOOPS.map(loop => ({
    ...loop,
    id: uuidv4(),
  }))
}

export function parseLoopPlannerResponse(value: unknown): LoopPlannerResponse {
  const row = recordFromJson(value)
  const loops = recordArrayFromJson(row[LoopPlannerJsonKey.Loops]).map(parseGameLoopFromJson)
  if (loops.length === 0) {
    return {
      analysis: '',
      loops: createFallbackLoops(),
      recommendations: [LoopPlannerCopy.ContinueRefining],
      message: '',
    }
  }

  return {
    analysis: readRowString(row, LoopPlannerJsonKey.Analysis) ?? '',
    loops,
    recommendations: stringArrayFromJson(row[LoopPlannerJsonKey.Recommendations]),
    message: readRowString(row, LoopPlannerJsonKey.Message) ?? '',
  }
}

function psychPhaseIndex(phase: GameLoopNode['psychPhase']): number {
  for (let index = 0; index < LOOP_PLANNER_PSYCH_PHASES.length; index += 1) {
    if (LOOP_PLANNER_PSYCH_PHASES[index] === phase) return index
  }
  return -1
}

export function comparePsychPhaseNodes(a: GameLoopNode, b: GameLoopNode): number {
  return psychPhaseIndex(a.psychPhase) - psychPhaseIndex(b.psychPhase)
}
