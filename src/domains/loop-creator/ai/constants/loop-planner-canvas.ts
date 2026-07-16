import { readString, recordFromJson } from '@/shared/data/json-guards'
import { v4 as uuidv4 } from 'uuid'
import type { GameLoop, GameLoopNode, LoopAgentAction } from '../../core/graph/state'
import { comparePsychPhaseNodes } from './loop-planner-parse'

const GROUP_WIDTH = 420
const GROUP_GAP = 150
const NODE_WIDTH = 320
const NODE_HEIGHT = 220
const NODE_GAP_Y = 80
const GROUP_PADDING = 80
const GROUP_HEADER_HEIGHT = 80

const PHASE_TO_NODE_TYPE: Record<GameLoopNode['psychPhase'], string> = {
  challenge: 'challenge',
  action: 'action',
  feedback: 'reward',
}

const TIMEFRAME_ORDER = ['micro', 'core', 'session', 'meta', 'progression']

function loopTimeframe(loop: GameLoop): string {
  return loop.timeframe ?? loop.type
}

function sortLoopsByTimeframe(loops: GameLoop[]): GameLoop[] {
  return [...loops].sort(
    (a, b) => TIMEFRAME_ORDER.indexOf(loopTimeframe(a)) - TIMEFRAME_ORDER.indexOf(loopTimeframe(b))
  )
}

function buildGroupNodeAction(
  loop: GameLoop,
  groupId: string,
  currentGroupX: number,
  durationUnit: string
): LoopAgentAction {
  const timeframe = loopTimeframe(loop)
  return {
    type: 'ADD_NODE',
    payload: {
      id: groupId,
      label: `${loop.name}`,
      description: `${loop.description}\n\n⏱️ ${loop.duration?.typical || '?'} ${durationUnit}`,
      nodeType: 'group',
      position: { x: currentGroupX, y: 50 },
      timeframe,
      loopData: {
        type: loop.type,
        timeframe,
        duration: loop.duration,
        playerExperience: loop.playerExperience,
        satisfactionPeak: loop.satisfactionPeak,
      },
    },
    confidence: 0.85,
    reasoning: `${timeframe.toUpperCase()} LOOP: ${loop.name}`,
  }
}

function buildPsychNodeActions(
  loop: GameLoop,
  sortedNodes: GameLoopNode[],
  groupId: string,
  nodeCenterX: number,
  startY: number
): { actions: LoopAgentAction[]; nodeIds: string[] } {
  const actions: LoopAgentAction[] = []
  const nodeIds: string[] = []
  let nodeY = startY
  const timeframe = loopTimeframe(loop)

  for (const node of sortedNodes) {
    const nodeId = `${loop.id}-${node.name?.replace(/\s+/g, '-').toLowerCase() || uuidv4()}`
    const psychPhase = node.psychPhase
    const nodeType = PHASE_TO_NODE_TYPE[psychPhase] ?? 'action'

    actions.push({
      type: 'ADD_NODE',
      payload: {
        id: nodeId,
        label: node.name,
        description: node.description,
        nodeType,
        position: { x: nodeCenterX, y: nodeY },
        parentId: groupId,
        psychPhase,
        timeframe,
      },
      confidence: 0.85,
      reasoning: `${psychPhase.toUpperCase()}: ${node.description?.slice(0, 40) || node.name}`,
    })

    nodeIds.push(nodeId)
    nodeY += NODE_HEIGHT + NODE_GAP_Y
  }

  return { actions, nodeIds }
}

function buildVerticalEdgeActions(
  sortedNodes: GameLoopNode[],
  nodeIds: string[]
): LoopAgentAction[] {
  const actions: LoopAgentAction[] = []

  for (let index = 0; index < nodeIds.length - 1; index += 1) {
    const sourcePhase = sortedNodes[index]?.psychPhase ?? 'challenge'
    const targetPhase = sortedNodes[index + 1]?.psychPhase ?? 'action'

    actions.push({
      type: 'ADD_EDGE',
      payload: {
        id: `edge-${nodeIds[index]}-${nodeIds[index + 1]}`,
        source: nodeIds[index],
        target: nodeIds[index + 1],
        label: '',
        sourceHandle: 'bottom',
        targetHandle: 'top',
      },
      confidence: 0.9,
      reasoning: `${sourcePhase} → ${targetPhase}`,
    })
  }

  return actions
}

function buildLoopClosureEdge(nodeIds: string[]): LoopAgentAction | null {
  if (nodeIds.length < 2) return null

  return {
    type: 'ADD_EDGE',
    payload: {
      id: `edge-loop-${nodeIds[nodeIds.length - 1]}-${nodeIds[0]}`,
      source: nodeIds[nodeIds.length - 1],
      target: nodeIds[0],
      label: '↺',
      style: 'dashed',
      sourceHandle: 'right-out',
      targetHandle: 'right-in',
    },
    confidence: 0.8,
    reasoning: 'Loop closure: feeds back to start',
  }
}

function buildInterGroupEdges(sortedLoops: GameLoop[]): LoopAgentAction[] {
  const actions: LoopAgentAction[] = []

  for (let index = 0; index < sortedLoops.length - 1; index += 1) {
    const sourceLoop = sortedLoops[index]
    const targetLoop = sortedLoops[index + 1]
    const sourceTimeframe = loopTimeframe(sourceLoop)
    const targetTimeframe = loopTimeframe(targetLoop)

    actions.push({
      type: 'ADD_EDGE',
      payload: {
        id: `edge-group-${sourceLoop.id}-${targetLoop.id}`,
        source: `group-${sourceLoop.id}`,
        target: `group-${targetLoop.id}`,
        label: '→',
        style: 'thick',
        animated: true,
      },
      confidence: 0.8,
      reasoning: `${sourceTimeframe} feeds into ${targetTimeframe}`,
    })
  }

  return actions
}

export function buildCanvasActionsFromLoops(loops: GameLoop[]): LoopAgentAction[] {
  const nodeActions: LoopAgentAction[] = []
  const sortedLoops = sortLoopsByTimeframe(loops)
  let currentGroupX = 50

  for (const loop of sortedLoops) {
    const loopNodes = loop.nodes ?? []
    const durationUnit = readString(recordFromJson(loop.duration).unit) ?? 'seconds'
    const sortedNodes = [...loopNodes].sort(comparePsychPhaseNodes)

    const groupId = `group-${loop.id}`
    nodeActions.push(buildGroupNodeAction(loop, groupId, currentGroupX, durationUnit))

    const nodeCenterX = currentGroupX + GROUP_WIDTH / 2 - NODE_WIDTH / 2
    const startY = 50 + GROUP_HEADER_HEIGHT + GROUP_PADDING
    const { actions: psychNodeActions, nodeIds } = buildPsychNodeActions(
      loop,
      sortedNodes,
      groupId,
      nodeCenterX,
      startY
    )
    nodeActions.push(...psychNodeActions)
    nodeActions.push(...buildVerticalEdgeActions(sortedNodes, nodeIds))

    const closureEdge = buildLoopClosureEdge(nodeIds)
    if (closureEdge) nodeActions.push(closureEdge)

    currentGroupX += GROUP_WIDTH + GROUP_GAP
  }

  nodeActions.push(...buildInterGroupEdges(sortedLoops))
  return nodeActions
}
