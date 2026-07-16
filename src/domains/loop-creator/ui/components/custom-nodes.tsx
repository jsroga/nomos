import React from 'react'
import { Handle, Position, NodeProps, Node } from '@xyflow/react'
import {
  LOOP_DURATION_UNIT,
  LOOP_HANDLE_BORDER,
  LOOP_NODE_COLORS,
  LOOP_NODE_DEFAULT_COLOR,
  LOOP_NODE_DEFAULT_ICON,
  LOOP_NODE_ICONS,
  LOOP_TIMEFRAME_TEXT_CLASS,
  LoopNodeType,
  LoopPlayerAgency,
  LoopTimeframe,
} from '../../constants/custom-nodes'

export const nodeColors: Record<string, string> = LOOP_NODE_COLORS
export const nodeIcons: Record<string, string> = LOOP_NODE_ICONS

export interface LoopNodeData {
  label: string
  description: string
  nodeType: LoopNodeType
  timescale: string
  duration?: string
  playerAgency?: string
  skillTypes?: string[]
  designNotes?: string
  [key: string]: unknown
}

export const LoopNode: React.FC<NodeProps<Node<LoopNodeData>>> = ({ data, selected }) => {
  const nodeType = data.nodeType || LoopNodeType.Action
  const borderColor = nodeColors[nodeType] || LOOP_NODE_DEFAULT_COLOR
  const icon = nodeIcons[nodeType] || LOOP_NODE_DEFAULT_ICON

  const handleStyle = {
    background: borderColor,
    width: 12,
    height: 12,
    border: LOOP_HANDLE_BORDER,
  }

  return (
    <div
      className={`p-4 rounded-xl bg-[#1a1a24] border-l-4 shadow-xl min-w-[220px] max-w-[280px] transition-all duration-200 ${
        selected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#0d0d14]' : ''
      }`}
      style={{ borderLeftColor: borderColor }}
    >
      {/* Input handle at TOP for vertical flow */}
      <Handle type="target" position={Position.Top} id="top" style={handleStyle} />

      {/* Input handle on RIGHT for loop-back (first node receives from last) */}
      <Handle
        type="target"
        position={Position.Right}
        id="right-in"
        style={{ ...handleStyle, top: '25%' }}
      />

      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span
          className="text-[10px] uppercase font-bold tracking-wider"
          style={{ color: borderColor }}
        >
          {nodeType}
        </span>
      </div>

      <div className="text-sm font-bold text-white mb-1.5 leading-tight">{data.label}</div>

      <div className="text-[11px] text-gray-400 line-clamp-6 leading-normal">
        {data.description}
      </div>

      {data.duration && (
        <div className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
          <span>⏱</span> {data.duration}
        </div>
      )}

      {data.playerAgency && (
        <div
          className={`text-[10px] mt-1 ${data.playerAgency === LoopPlayerAgency.High ? 'text-emerald-400' : 'text-gray-500'}`}
        >
          Agency: {data.playerAgency}
        </div>
      )}

      {/* Output handle at BOTTOM for vertical flow */}
      <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle} />

      {/* Output handle on RIGHT for loop-back (last node sends to first) */}
      <Handle
        type="source"
        position={Position.Right}
        id="right-out"
        style={{ ...handleStyle, top: '75%' }}
      />
    </div>
  )
}

export interface GroupNodeData {
  label: string
  description?: string
  timeframe?: LoopTimeframe
  timescale?: string
  loopData?: {
    type?: string
    timeframe?: string
    duration?: { min: number; max: number; typical: number; unit?: string }
    playerExperience?: string
    satisfactionPeak?: string
  }
  [key: string]: unknown
}

const timeframeColors: Record<string, { bg: string; border: string; text: string }> = {
  [LoopTimeframe.Micro]: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/50', text: LOOP_TIMEFRAME_TEXT_CLASS[LoopTimeframe.Micro] },
  [LoopTimeframe.Core]: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/50', text: LOOP_TIMEFRAME_TEXT_CLASS[LoopTimeframe.Core] },
  [LoopTimeframe.Session]: { bg: 'bg-amber-500/10', border: 'border-amber-500/50', text: LOOP_TIMEFRAME_TEXT_CLASS[LoopTimeframe.Session] },
  [LoopTimeframe.Meta]: { bg: 'bg-purple-500/10', border: 'border-purple-500/50', text: LOOP_TIMEFRAME_TEXT_CLASS[LoopTimeframe.Meta] },
  [LoopTimeframe.Progression]: { bg: 'bg-rose-500/10', border: 'border-rose-500/50', text: LOOP_TIMEFRAME_TEXT_CLASS[LoopTimeframe.Progression] },
}

export const GroupNode: React.FC<NodeProps<Node<GroupNodeData>>> = ({ data, selected }) => {
  const timeframe = data.loopData?.timeframe || data.timeframe || LoopTimeframe.Core
  const colors = timeframeColors[timeframe] || timeframeColors[LoopTimeframe.Core]
  const duration = data.loopData?.duration
  const durationText = duration ? `${duration.typical} ${duration.unit || LOOP_DURATION_UNIT}` : ''

  const handleStyle = {
    background: LOOP_NODE_DEFAULT_COLOR,
    width: 10,
    height: 10,
    border: LOOP_HANDLE_BORDER,
  }

  return (
    <div
      className={`p-4 rounded-xl ${colors.bg} border ${colors.border} shadow-lg min-w-[260px] max-w-[320px] transition-all duration-200 ${
        selected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#0d0d14]' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} id="top" style={handleStyle} />

      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={`text-xs font-bold uppercase tracking-widest ${colors.text}`}>
          {timeframe} Loop
        </span>
        {durationText && <span className="text-[10px] text-gray-500">⏱ {durationText}</span>}
      </div>

      <div className="text-sm font-bold text-white mb-1.5 leading-tight">{data.label}</div>

      {data.description && (
        <div className="text-[11px] text-gray-400 line-clamp-3 leading-normal mb-2">
          {data.description}
        </div>
      )}

      {data.loopData?.playerExperience && (
        <div className="text-[10px] text-gray-500 mt-1">🎮 {data.loopData.playerExperience}</div>
      )}

      <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle} />
    </div>
  )
}

export const nodeTypes = {
  challengeNode: LoopNode,
  actionNode: LoopNode,
  rewardNode: LoopNode,
  feedbackNode: LoopNode,
  group: GroupNode,
}
