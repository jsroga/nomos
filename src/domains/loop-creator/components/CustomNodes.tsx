import React from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';

export const nodeColors: Record<string, string> = {
  challenge: '#ff4444',
  action: '#4488ff',
  reward: '#ffcc00',
  feedback: '#44dd66',
};

export const nodeIcons: Record<string, string> = {
  challenge: '⚔️',
  action: '🎮',
  reward: '⭐',
  feedback: '📊',
};

export interface LoopNodeData {
  label: string;
  description: string;
  nodeType: 'challenge' | 'action' | 'reward' | 'feedback';
  timescale: string;
  duration?: string;
  playerAgency?: string;
  skillTypes?: string[];
  designNotes?: string;
  [key: string]: any;
}

export const LoopNode: React.FC<NodeProps<Node<LoopNodeData>>> = ({ data, selected }) => {
  const nodeType = data.nodeType || 'action';
  const borderColor = nodeColors[nodeType] || '#666';
  const icon = nodeIcons[nodeType] || '●';

  const handleStyle = {
    background: borderColor,
    width: 12,
    height: 12,
    border: '2px solid #1a1a24',
  };

  return (
    <div
      className={`p-3 rounded-lg bg-[#1a1a24] border-l-4 shadow-lg min-w-[180px] max-w-[220px] transition-all duration-200 ${
        selected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0d0d14]' : ''
      }`}
      style={{ borderLeftColor: borderColor }}
    >
      {/* Input handle at TOP for vertical flow */}
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top"
        style={handleStyle} 
      />
      
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
      
      <div className="text-sm font-bold text-white mb-1.5 leading-tight">
        {data.label}
      </div>
      
      <div className="text-[11px] text-gray-400 line-clamp-3 leading-normal">
        {data.description}
      </div>
      
      {data.duration && (
        <div className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
          <span>⏱</span> {data.duration}
        </div>
      )}
      
      {data.playerAgency && (
        <div className={`text-[10px] mt-1 ${data.playerAgency === 'high' ? 'text-emerald-400' : 'text-gray-500'}`}>
          Agency: {data.playerAgency}
        </div>
      )}
      
      {/* Output handle at BOTTOM for vertical flow */}
      <Handle 
        type="source" 
        position={Position.Bottom}
        id="bottom"
        style={handleStyle} 
      />
      
      {/* Output handle on RIGHT for loop-back (last node sends to first) */}
      <Handle 
        type="source" 
        position={Position.Right}
        id="right-out"
        style={{ ...handleStyle, top: '75%' }} 
      />
    </div>
  );
};

export const GroupNode: React.FC<NodeProps> = ({ data }) => {
  const timescaleColor = 
    data.timescale === 'moment' ? 'text-cyan-400' :
    data.timescale === 'minute' ? 'text-emerald-400' :
    data.timescale === 'hour' ? 'text-amber-500' :
    'text-purple-500';

  return (
    <div className="p-3">
      <div className={`text-xs font-bold uppercase tracking-widest ${timescaleColor}`}>
        {data.label as string}
      </div>
    </div>
  );
};

export const nodeTypes = {
  challengeNode: LoopNode,
  actionNode: LoopNode,
  rewardNode: LoopNode,
  feedbackNode: LoopNode,
  group: GroupNode,
};

