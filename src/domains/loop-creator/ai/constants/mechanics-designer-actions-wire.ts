import { LoopNodeType } from '@/domains/loop-creator/constants/custom-nodes'
import type { LoopAgentAction, LoopCreatorState, MechanicEdge, MechanicNode } from '../../core/graph/state'
import {
  MechanicNodeKind,
  MechanicsDesignerListSeparator,
  MechanicsDesignerLog,
} from './mechanics-designer-wire'

export enum LoopCanvasAgentAction {
  AddNode = 'ADD_NODE',
  AddEdge = 'ADD_EDGE',
}

const MECHANIC_NODE_TYPE_MAP: Record<MechanicNodeKind, LoopNodeType> = {
  [MechanicNodeKind.Core]: LoopNodeType.Challenge,
  [MechanicNodeKind.Secondary]: LoopNodeType.Action,
  [MechanicNodeKind.Meta]: LoopNodeType.Feedback,
  [MechanicNodeKind.Progression]: LoopNodeType.Reward,
  [MechanicNodeKind.Reward]: LoopNodeType.Reward,
}

function resolveCanvasNodeType(mechanicType: MechanicNode['type']): LoopNodeType {
  for (const kind of Object.values(MechanicNodeKind)) {
    if (kind === mechanicType) return MECHANIC_NODE_TYPE_MAP[kind]
  }
  return LoopNodeType.Action
}

export function buildMechanicCanvasActions(
  mechanics: MechanicNode[],
  connections: MechanicEdge[],
  analysis: string,
): LoopAgentAction[] {
  const actions: LoopAgentAction[] = []
  let yOffset = 100

  for (const mechanic of mechanics) {
    actions.push({
      type: LoopCanvasAgentAction.AddNode,
      payload: {
        id: mechanic.id,
        label: mechanic.name,
        description: mechanic.description,
        nodeType: resolveCanvasNodeType(mechanic.type),
        position: { x: 200 + (Math.random() * 200 - 100), y: yOffset },
        mechanicData: {
          type: mechanic.type,
          inputs: mechanic.inputs,
          outputs: mechanic.outputs,
          balanceFactors: mechanic.balanceFactors,
          examples: mechanic.examples,
        },
      },
      confidence: 0.8,
      reasoning: analysis,
    })
    yOffset += 120
  }

  for (const connection of connections) {
    actions.push({
      type: LoopCanvasAgentAction.AddEdge,
      payload: {
        id: connection.id,
        source: connection.source,
        target: connection.target,
        label: connection.label || connection.type,
      },
      confidence: 0.8,
      reasoning: analysis,
    })
  }

  return actions
}

export async function buildConceptEvaluationNote(
  state: LoopCreatorState,
  mechanics: MechanicNode[],
): Promise<string> {
  try {
    const { evaluateConceptAlignment } = await import('../agents/concept-evaluator')
    const evaluation = await evaluateConceptAlignment({ ...state, mechanics })

    if (evaluation.overallAlignment < 60) {
      let note = `\n\n⚠️ **Concept Alignment: ${evaluation.overallAlignment}/100**\n${evaluation.summary}`
      if (evaluation.conceptMatch?.missingElements?.length) {
        note += `\n\nMissing elements: ${evaluation.conceptMatch.missingElements.join(MechanicsDesignerListSeparator.CommaSpace)}`
      }
      return note
    }

    if (evaluation.overallAlignment >= 80) {
      return `\n\n✨ **High concept alignment: ${evaluation.overallAlignment}/100**`
    }

    return ''
  } catch (error) {
    console.error(MechanicsDesignerLog.EvaluationError, error)
    return ''
  }
}
