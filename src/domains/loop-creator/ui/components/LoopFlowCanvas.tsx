'use client'

import React from 'react'
import {
  Background,
  BackgroundVariant,
  Connection,
  ConnectionLineType,
  Controls,
  Edge,
  MarkerType,
  Node,
  OnEdgesChange,
  OnNodesChange,
  ReactFlow,
  ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { nodeTypes } from './custom-nodes'
import { PropertiesPanel } from './PropertiesPanel'
import { SuggestionPanel, Suggestion } from './SuggestionPanel'
import { LoopEmptyState } from './LoopEmptyState'
import { LOOP_CONNECTION_STROKE } from '../constants/loop-creator-layout'

const EDGE_LABEL_BG_PADDING: [number, number] = [6, 4]

interface LoopFlowCanvasProps {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: (params: Connection) => void
  onInit: (instance: ReactFlowInstance) => void
  onNodeClick: (event: React.MouseEvent, node: Node) => void
  onPaneClick: () => void
  selectedNode: Node | null
  onNodeUpdate: (nodeId: string, updates: Record<string, unknown>) => void
  onNodeDelete: (nodeId: string) => void
  onCloseProperties: () => void
  suggestions: Suggestion[]
  onAcceptSuggestion: (suggestion: Suggestion) => void
  onRejectSuggestion: (suggestion: Suggestion) => void
  onClearAllSuggestions: () => void
  onAcceptAllSuggestions: () => void
  currentLoopId: string | null
  isTourActive: boolean
  onCreateLoopFromEmptyState: () => void
  canvasTourId: string
  suggestionsTourId: string
}

export function LoopFlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onInit,
  onNodeClick,
  onPaneClick,
  selectedNode,
  onNodeUpdate,
  onNodeDelete,
  onCloseProperties,
  suggestions,
  onAcceptSuggestion,
  onRejectSuggestion,
  onClearAllSuggestions,
  onAcceptAllSuggestions,
  currentLoopId,
  isTourActive,
  onCreateLoopFromEmptyState,
  canvasTourId,
  suggestionsTourId,
}: LoopFlowCanvasProps) {
  return (
    <div className="flex-1 overflow-hidden p-4 relative">
      <div className="absolute inset-0 p-4">
        <div className="h-full w-full rounded-xl border bg-card/50 shadow-inner overflow-hidden relative">
          <div className="absolute inset-0 bg-slate-950/20" id={canvasTourId}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={onInit}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              fitView
              className="bg-background"
              connectionLineType={ConnectionLineType.SmoothStep}
              defaultEdgeOptions={{
                type: 'smoothstep',
                animated: true,
                style: {
                  stroke: '#6366f1',
                  strokeWidth: 2,
                },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  color: '#6366f1',
                  width: 20,
                  height: 20,
                },
                labelStyle: {
                  fill: '#94a3b8',
                  fontSize: 10,
                  fontWeight: 500,
                },
                labelBgStyle: {
                  fill: '#0f172a',
                  fillOpacity: 0.9,
                },
                labelBgPadding: EDGE_LABEL_BG_PADDING,
                labelBgBorderRadius: 4,
              }}
            >
              <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#334155" />
              <Controls className="bg-muted text-muted-foreground border-border" />
            </ReactFlow>
          </div>

          <div id={suggestionsTourId}>
            <SuggestionPanel
              suggestions={suggestions}
              onAccept={onAcceptSuggestion}
              onReject={onRejectSuggestion}
              onClearAll={onClearAllSuggestions}
              onAcceptAll={onAcceptAllSuggestions}
            />
          </div>

          <PropertiesPanel
            selectedNode={selectedNode}
            onClose={onCloseProperties}
            onUpdate={onNodeUpdate}
            onDelete={onNodeDelete}
          />

          {!currentLoopId && !isTourActive && (
            <LoopEmptyState onCreateLoop={onCreateLoopFromEmptyState} />
          )}
        </div>
      </div>
    </div>
  )
}

export { LOOP_CONNECTION_STROKE }
