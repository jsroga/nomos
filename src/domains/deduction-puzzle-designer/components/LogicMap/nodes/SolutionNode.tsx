import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Define the data structure for our custom node
type SolutionNodeData = {
    label: string;
    type?: 'solution' | 'clue' | 'distractor';
};

// We need to cast the generic Node type to include our data
type CustomNode = Node<SolutionNodeData>;

export const SolutionNode = memo(({ data, selected }: NodeProps<CustomNode>) => {
    return (
        <div className={cn(
            "min-w-[180px] rounded-md shadow-md border-2 bg-card text-card-foreground transition-all",
            selected ? "border-primary ring-2 ring-primary/20" : "border-border",
            "hover:border-primary/50"
        )}>
            <Handle type="target" position={Position.Left} className="!bg-muted-foreground !w-3 !h-3 rounded-full border-2 border-background" />

            <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Solution</span>
                <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
            </div>

            <div className="p-3">
                <div className="text-sm font-medium">{data.label}</div>
            </div>

            <Handle type="source" position={Position.Right} className="!bg-muted-foreground !w-3 !h-3 rounded-full border-2 border-background" />
        </div>
    );
});

SolutionNode.displayName = 'SolutionNode';
