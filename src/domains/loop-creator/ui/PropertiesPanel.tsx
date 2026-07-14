import React, { useState, useEffect } from 'react'
import { Node } from '@xyflow/react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Textarea } from '@/components/Textarea'
import { Label } from '@/components/Label'
import { X, Trash2, Swords, Gamepad2, Star, BarChart3, Layers } from 'lucide-react'
import { Badge } from '@/components/Badge'
import { readString } from '@/shared/data/json-guards'
import { LoopNodeType } from '@/domains/loop-creator/constants/custom-nodes'
import { LOOP_NODE_DEFAULT_COLOR } from '@/domains/loop-creator/constants/custom-nodes'
import { LOOP_NODE_TYPE_DEFAULT } from '@/domains/loop-creator/constants/loop-node-defaults'
import { LoopTimescaleOrder } from '@/domains/loop-creator/constants/timescale-order'
import { LoopPlayerAgency } from '@/domains/loop-creator/constants/custom-nodes'
import { CANVAS_NODE_TYPE_GROUP } from '@/domains/loop-creator/constants/graph-state-defaults'
import {
  PROPERTIES_PANEL_AGENCY_OPTIONS,
  PROPERTIES_PANEL_NODE_TYPE_OPTIONS,
  PROPERTIES_PANEL_TIMESCALE_OPTIONS,
} from '@/domains/loop-creator/constants/properties-panel'
import {
  LOOP_DOMAIN_TO_FLOW_NODE,
  LoopFlowNodeType,
} from '@/domains/loop-creator/ui/constants/loop-creator-layout'
import { nodeColors } from './CustomNodes'

interface PropertiesPanelProps {
  selectedNode: Node | null
  onClose: () => void
  onUpdate: (nodeId: string, updates: Record<string, unknown>) => void
  onDelete: (nodeId: string) => void
}

const nodeTypeIcons = {
  [LoopNodeType.Challenge]: Swords,
  [LoopNodeType.Action]: Gamepad2,
  [LoopNodeType.Reward]: Star,
  [LoopNodeType.Feedback]: BarChart3,
} as const

const nodeTypeOptions = PROPERTIES_PANEL_NODE_TYPE_OPTIONS.map(option => ({
  ...option,
  icon: nodeTypeIcons[option.value],
}))

const agencyOptions = PROPERTIES_PANEL_AGENCY_OPTIONS
const timescaleOptions = PROPERTIES_PANEL_TIMESCALE_OPTIONS

// Styled native select component
function StyledSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: readonly { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full h-8 px-3 rounded-md bg-slate-900/50 border border-slate-700/50 text-sm text-white 
                 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50
                 appearance-none cursor-pointer"
      style={{
        backgroundImage:
          'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2394a3b8\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
        backgroundSize: '16px',
      }}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value} className="bg-slate-900">
          {opt.label}
        </option>
      ))}
    </select>
  )
}

export function PropertiesPanel({
  selectedNode,
  onClose,
  onUpdate,
  onDelete,
}: PropertiesPanelProps) {
  const [localData, setLocalData] = useState<Record<string, unknown>>({})

  // Sync local state when selected node changes
  useEffect(() => {
    if (selectedNode) {
      setLocalData(selectedNode.data || {})
    }
  }, [selectedNode])

  if (!selectedNode) return null

  const isGroup = selectedNode.type === CANVAS_NODE_TYPE_GROUP
  const nodeType = readString(localData.nodeType) ?? LOOP_NODE_TYPE_DEFAULT
  const borderColor = nodeColors[nodeType] || LOOP_NODE_DEFAULT_COLOR
  const selectedNodeTypeOption = nodeTypeOptions.find(t => t.value === nodeType)

  const handleFieldChange = (field: string, value: unknown) => {
    const newData = { ...localData, [field]: value }
    setLocalData(newData)
    onUpdate(selectedNode.id, { [field]: value })
  }

  const handleNodeTypeChange = (newType: string) => {
    const nodeTypeMap: Record<string, string> = {
      [LoopNodeType.Challenge]: LOOP_DOMAIN_TO_FLOW_NODE[LoopNodeType.Challenge],
      [LoopNodeType.Action]: LOOP_DOMAIN_TO_FLOW_NODE[LoopNodeType.Action],
      [LoopNodeType.Reward]: LOOP_DOMAIN_TO_FLOW_NODE[LoopNodeType.Reward],
      [LoopNodeType.Feedback]: LOOP_DOMAIN_TO_FLOW_NODE[LoopNodeType.Feedback],
    }

    // Update both the data.nodeType and the node.type
    setLocalData(prev => ({ ...prev, nodeType: newType }))
    onUpdate(selectedNode.id, {
      nodeType: newType,
      _changeNodeType: nodeTypeMap[newType] ?? LoopFlowNodeType.Action,
    })
  }

  return (
    <div className="absolute top-4 right-4 w-72 z-30 bg-[#0d0d14]/95 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50"
        style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
      >
        <div className="flex items-center gap-2">
          {isGroup ? (
            <Layers className="w-4 h-4 text-purple-400" />
          ) : (
            selectedNodeTypeOption?.icon &&
            React.createElement(selectedNodeTypeOption.icon, {
              className: `w-4 h-4 ${selectedNodeTypeOption.color}`,
            })
          )}
          <span className="text-sm font-semibold text-white">
            {isGroup ? 'Edit Group' : 'Edit Node'}
          </span>
          <Badge variant="secondary" className="text-[9px] h-4 bg-slate-800/50">
            {selectedNode.id.slice(0, 12)}...
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-white"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
        {/* Label */}
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-400">{isGroup ? 'Group Name' : 'Label'}</Label>
          <Input
            value={readString(localData.label) ?? ''}
            onChange={e => handleFieldChange('label', e.target.value)}
            className="h-8 bg-slate-900/50 border-slate-700/50 text-sm"
            placeholder={isGroup ? 'e.g., Moment Loop' : 'e.g., Collect Coins'}
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-400">Description</Label>
          <Textarea
            value={readString(localData.description) ?? ''}
            onChange={e => handleFieldChange('description', e.target.value)}
            className="min-h-[60px] bg-slate-900/50 border-slate-700/50 text-sm resize-none"
            placeholder="Describe this element..."
          />
        </div>

        {/* Timescale (for groups) */}
        {isGroup && (
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Timescale</Label>
            <StyledSelect
              value={readString(localData.timescale) ?? LoopTimescaleOrder.Custom}
              onChange={v => handleFieldChange('timescale', v)}
              options={timescaleOptions}
            />
          </div>
        )}

        {/* Node Type (for non-groups) */}
        {!isGroup && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Node Type</Label>
              <StyledSelect
                value={nodeType}
                onChange={handleNodeTypeChange}
                options={nodeTypeOptions}
              />
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Duration</Label>
              <Input
                value={readString(localData.duration) ?? ''}
                onChange={e => handleFieldChange('duration', e.target.value)}
                className="h-8 bg-slate-900/50 border-slate-700/50 text-sm"
                placeholder="e.g., 0.5-2s, 5min"
              />
            </div>

            {/* Player Agency */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Player Agency</Label>
              <StyledSelect
                value={readString(localData.playerAgency) ?? LoopPlayerAgency.Medium}
                onChange={v => handleFieldChange('playerAgency', v)}
                options={agencyOptions}
              />
            </div>

            {/* Timescale */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Timescale</Label>
              <StyledSelect
                value={readString(localData.timescale) ?? LoopTimescaleOrder.Custom}
                onChange={v => handleFieldChange('timescale', v)}
                options={timescaleOptions}
              />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-800/50 bg-slate-900/30">
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2"
          onClick={() => onDelete(selectedNode.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete {isGroup ? 'Group' : 'Node'}
        </Button>
      </div>
    </div>
  )
}
