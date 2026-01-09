"use client";

import React, { useCallback } from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
    Node,
    Edge,
    Connection,
    NodeChange,
    EdgeChange,
    BackgroundVariant,
    useNodesState,
    useEdgesState
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { LogicNode } from './nodes/LogicNode';
import { usePuzzleStore } from '../../store/puzzle-store';

const nodeTypes = {
    logicNode: LogicNode,
};

const initialNodes: Node[] = [
    {
        id: '1',
        type: 'logicNode',
        position: { x: 100, y: 100 },
        data: { label: 'Microscope', type: 'solution' }
    },
    {
        id: '2',
        type: 'logicNode',
        position: { x: 400, y: 50 },
        data: { label: 'Missing from Desk', type: 'clue', subLabel: '(Visual)' }
    },
    {
        id: '3',
        type: 'logicNode',
        position: { x: 400, y: 150 },
        data: { label: 'Rectangular Wound', type: 'clue', subLabel: '(Medical)' }
    },
];

const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: true },
    { id: 'e1-3', source: '1', target: '3', animated: true },
];

export function DeductionLogicMap() {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
        [setEdges],
    );

    return (
        <div className="h-full w-full bg-slate-950/20">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                className="bg-background"
            >
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#334155" />
                <Controls className="bg-muted text-muted-foreground border-border" />
            </ReactFlow>
        </div>
    );
}
