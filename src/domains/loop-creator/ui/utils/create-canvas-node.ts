import { Node } from '@xyflow/react'
import { LoopNodeType } from '@/domains/loop-creator/constants/custom-nodes'
import { CANVAS_NODE_TYPE_GROUP } from '@/domains/loop-creator/constants/graph-state-defaults'
import {
  LoopFlowNodeType,
  LoopGroupBorderStyle,
  LoopNodeTimescale,
  LoopPlayerAgencyLevel,
  LOOP_CREATE_DEFAULT_DESCRIPTIONS,
  LOOP_CREATE_DEFAULT_LABELS,
  LOOP_DOMAIN_TO_FLOW_NODE,
  LOOP_GROUP_BG_COLOR,
  LOOP_GROUP_BORDER_COLOR,
} from '../constants/loop-creator-layout'

export function createCanvasNode(
  nodeType: LoopNodeType | typeof CANVAS_NODE_TYPE_GROUP,
): Node {
  const id = `${nodeType}-${Date.now()}`

  if (nodeType === CANVAS_NODE_TYPE_GROUP) {
    return {
      id,
      type: LoopFlowNodeType.Group,
      position: { x: 100, y: 100 },
      style: {
        width: 500,
        height: 400,
        backgroundColor: LOOP_GROUP_BG_COLOR,
        borderColor: LOOP_GROUP_BORDER_COLOR,
        borderWidth: 2,
        borderStyle: LoopGroupBorderStyle.Dashed,
        borderRadius: 16,
      },
      data: {
        label: LOOP_CREATE_DEFAULT_LABELS[nodeType],
        timescale: LoopNodeTimescale.Custom,
        description: LOOP_CREATE_DEFAULT_DESCRIPTIONS[nodeType],
      },
    }
  }

  return {
    id,
    type: LOOP_DOMAIN_TO_FLOW_NODE[nodeType],
    position: { x: 200, y: 200 },
    data: {
      label: LOOP_CREATE_DEFAULT_LABELS[nodeType],
      description: LOOP_CREATE_DEFAULT_DESCRIPTIONS[nodeType],
      nodeType,
      timescale: LoopNodeTimescale.Custom,
      duration: '',
      playerAgency: LoopPlayerAgencyLevel.Medium,
    },
  }
}
