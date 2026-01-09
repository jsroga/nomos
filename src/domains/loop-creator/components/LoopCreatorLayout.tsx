"use client";

import React, { useCallback, useState } from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    addEdge,
    Node,
    Edge,
    Connection,
    BackgroundVariant,
    useNodesState,
    useEdgesState,
    ReactFlowInstance
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ChatInterface } from '@/domains/chat/components/ChatInterface';
import { useChatStream } from '@/domains/chat/hooks/useChatStream';
import { SectionProgress, ProgressSection } from '@/domains/chat/components/SectionProgress';
import { ActiveAgentsPanel } from '@/domains/chat/components/AgentLog';
import { SmartQuickActions } from '@/domains/chat/components/QuickActions';
import { Sparkles, Bot, Cpu, Scale, TrendingUp, Layout, Brain, Upload, Info, Wand2 } from 'lucide-react';
import { nodeTypes } from './CustomNodes';
import { autoLayoutNodes } from '../lib/layout';
import { Button } from '@/components/ui/button';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger 
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

// Agent configuration with icons for each loop creator agent
const LOOP_AGENT_CONFIG = {
    System: {
        color: 'text-muted-foreground',
        bgColor: 'bg-muted/50 border-border',
        icon: <Bot className="w-4 h-4" />,
    },
    supervisor: {
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10 border-blue-500/30',
        icon: <Brain className="w-4 h-4" />,
    },
    loop_planner: {
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10 border-purple-500/30',
        icon: <Layout className="w-4 h-4" />,
    },
    mechanics_designer: {
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10 border-emerald-500/30',
        icon: <Cpu className="w-4 h-4" />,
    },
    balance_analyst: {
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10 border-amber-500/30',
        icon: <Scale className="w-4 h-4" />,
    },
    progression_architect: {
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/10 border-rose-500/30',
        icon: <TrendingUp className="w-4 h-4" />,
    },
    LoopAssistant: {
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10 border-purple-500/30',
        icon: <Sparkles className="w-4 h-4" />,
    },
    User: {
        color: 'text-foreground',
        bgColor: 'bg-card border-border',
        icon: <Bot className="w-4 h-4" />,
    },
};

const initialNodes: Node[] = [
    {
        id: '1',
        type: 'default',
        position: { x: 250, y: 50 },
        data: { label: 'Start' },
        style: {
            background: 'hsl(235 88% 65%)',
            color: 'white',
            border: '2px solid hsl(240 3.7% 15.9%)',
            borderRadius: '8px',
            padding: '10px',
        }
    },
    {
        id: '2',
        type: 'default',
        position: { x: 100, y: 150 },
        data: { label: 'Step A' },
        style: {
            background: 'hsl(240 10% 3.9%)',
            color: 'hsl(0 0% 98%)',
            border: '1px solid hsl(240 3.7% 15.9%)',
            borderRadius: '8px',
            padding: '10px',
        }
    },
    {
        id: '3',
        type: 'default',
        position: { x: 400, y: 150 },
        data: { label: 'Step B' },
        style: {
            background: 'hsl(240 10% 3.9%)',
            color: 'hsl(0 0% 98%)',
            border: '1px solid hsl(240 3.7% 15.9%)',
            borderRadius: '8px',
            padding: '10px',
        }
    },
    {
        id: '4',
        type: 'default',
        position: { x: 250, y: 250 },
        data: { label: 'Loop Point' },
        style: {
            background: 'hsl(235 70% 55%)',
            color: 'white',
            border: '2px solid hsl(235 88% 65%)',
            borderRadius: '50%',
            width: '80px',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px',
        }
    },
    {
        id: '5',
        type: 'default',
        position: { x: 250, y: 380 },
        data: { label: 'End' },
        style: {
            background: 'hsl(0 62.8% 30.6%)',
            color: 'white',
            border: '2px solid hsl(240 3.7% 15.9%)',
            borderRadius: '8px',
            padding: '10px',
        }
    },
];

const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'hsl(235 88% 65%)' } },
    { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: 'hsl(235 88% 65%)' } },
    { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: 'hsl(235 70% 55%)' } },
    { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: 'hsl(235 70% 55%)' } },
    { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: 'hsl(0 62.8% 30.6%)' } },
    { id: 'e4-2', source: '4', target: '2', animated: true, type: 'smoothstep', style: { stroke: 'hsl(235 88% 65%)', strokeDasharray: '5,5' } },
];

interface LoopCreatorLayoutProps {
    projectId: string;
}

export function LoopCreatorLayout({ projectId }: LoopCreatorLayoutProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [threadId, setThreadId] = useState<string | null>(null);
    const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
    const [loopMetadata, setLoopMetadata] = useState<any>(null);
    const [analysis, setAnalysis] = useState<any>(null);
    const [isActivityPanelOpen, setIsActivityPanelOpen] = useState(false);
    const [gameContext, setGameContext] = useState({
        gameGenre: '',
        gamePlatform: '',
        targetAudience: '',
        gameDescription: '',
    });

    const handleTidyUp = useCallback(() => {
        setNodes((nds) => {
            const laidOutNodes = autoLayoutNodes(nds, edges);
            return laidOutNodes;
        });
        
        // Fit view after layout
        setTimeout(() => {
            if (rfInstance) {
                rfInstance.fitView({ padding: 0.1, duration: 800 });
            }
        }, 100);
    }, [edges, setNodes, rfInstance]);

    const onImportJson = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const data = JSON.parse(content);

                let transformedNodes: Node[] = [];
                if (data.nodes) {
                    transformedNodes = data.nodes.map((node: any) => ({
                        ...node,
                        // Convert parentNode to parentId for @xyflow/react v12
                        parentId: node.parentNode || node.parentId,
                        parentNode: undefined, // Remove deprecated property
                        draggable: node.type !== 'group',
                    }));
                    // Automatically tidy up imported nodes
                    transformedNodes = autoLayoutNodes(transformedNodes, data.edges || []);
                    setNodes(transformedNodes);
                }

                if (data.edges) {
                    const transformedEdges = data.edges.map((edge: any) => {
                        // Detect loop-back edges (label is exactly "LOOP" or contains "LOOP")
                        const isLoopBack = edge.label === 'LOOP' || 
                                          (typeof edge.label === 'string' && edge.label.includes('LOOP')) ||
                                          edge.style?.strokeWidth === 3;
                        
                        console.log(`Edge ${edge.id}: isLoopBack=${isLoopBack}, label="${edge.label}"`);
                        
                        if (isLoopBack) {
                            // Loop-back edge: route through RIGHT side handles
                            return {
                                ...edge,
                                type: 'smoothstep',
                                sourceHandle: 'right-out',
                                targetHandle: 'right-in',
                                labelBgStyle: { fill: '#0d0d14', fillOpacity: 0.95 },
                                labelBgPadding: [8, 12],
                                labelBgBorderRadius: 8,
                                labelStyle: { fill: '#fff', fontSize: 12, fontWeight: 700 },
                            };
                        }
                        
                        // Normal edge: vertical flow (bottom → top) using handle IDs
                        return {
                            ...edge,
                            type: 'smoothstep',
                            sourceHandle: 'bottom',
                            targetHandle: 'top',
                            labelBgStyle: { fill: '#0d0d14', fillOpacity: 0.9 },
                            labelBgPadding: [6, 10],
                            labelBgBorderRadius: 6,
                            labelStyle: { fill: '#fff', fontSize: 11, fontWeight: 500 },
                        };
                    });
                    console.log('Transformed edges:', transformedEdges.filter((e: any) => e.sourceHandle === 'right-out'));
                    setEdges(transformedEdges);
                }

                if (data.metadata) {
                    setLoopMetadata(data.metadata);
                    setGameContext(prev => ({
                        ...prev,
                        gameGenre: data.metadata.genre?.join(', ') || prev.gameGenre,
                        gameDescription: data.metadata.description || prev.gameDescription,
                    }));
                }

                if (data.analysis) {
                    setAnalysis(data.analysis);
                }

                // Fit view after a small delay to allow nodes to render
                setTimeout(() => {
                    if (rfInstance) {
                        rfInstance.fitView({ padding: 0.1, duration: 800 });
                    }
                }, 200);

            } catch (error) {
                console.error('Error parsing JSON:', error);
                alert('Failed to parse JSON file. Please ensure it follows the correct format.');
            }
        };
        reader.readAsText(file);
        // Reset file input
        event.target.value = '';
    }, [setNodes, setEdges, rfInstance]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'hsl(235 88% 65%)' } }, eds)),
        [setEdges],
    );

    const {
        messages,
        setMessages,
        isSending,
        sendMessage,
        thinkingAgent,
        stopStream,
        streamingTokens,
        isTokenStreaming,
        activeAgents,
        streamingSections,
        citations,
        groundingScore,
    } = useChatStream({
        initialMessages: [{
            sender: 'supervisor',
            content: `👋 Hello! I'm your Game Loop Design Assistant. I coordinate a team of specialists to help you create engaging game mechanics and loops.

**My team includes:**
- 🎯 **Loop Planner** - Designs overall loop structure
- ⚙️ **Mechanics Designer** - Creates individual mechanics
- ⚖️ **Balance Analyst** - Evaluates effort/reward balance
- 📈 **Progression Architect** - Designs progression systems

To get started, tell me about the game you're designing. What **genre** and **platform** are you targeting?`,
            type: 'ai'
        }],
        onStreamingUpdate: (data) => {
            // Handle state updates from the graph
            if (data.type === 'state') {
                // Update nodes/edges based on mechanics and connections
                if (data.mechanics > 0 || data.loops > 0) {
                    console.log(`[LoopCreator] State update: ${data.mechanics} mechanics, ${data.loops} loops`)
                }
            }
            // Capture threadId for conversation continuity
            if (data.type === 'start' && data.threadId) {
                setThreadId(data.threadId)
            }
        },
        onAction: async (action) => {
            // Handle actions from the loop creator graph
            console.log('[LoopCreator] Action received:', action.type, action.payload)
            
            // Update canvas based on action type
            if (action.type === 'ADD_MECHANIC') {
                const mechanic = action.payload
                const newNode: Node = {
                    id: mechanic.id,
                    type: 'default',
                    position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
                    data: { label: mechanic.name },
                    style: {
                        background: mechanic.type === 'core' ? 'hsl(235 88% 65%)' : 'hsl(240 10% 3.9%)',
                        color: 'white',
                        border: '1px solid hsl(240 3.7% 15.9%)',
                        borderRadius: '8px',
                        padding: '10px',
                    }
                }
                setNodes(prev => [...prev, newNode])
            } else if (action.type === 'ADD_CONNECTION') {
                const conn = action.payload
                const newEdge: Edge = {
                    id: conn.id,
                    source: conn.source,
                    target: conn.target,
                    animated: true,
                    label: conn.label,
                    style: { stroke: 'hsl(235 88% 65%)' }
                }
                setEdges(prev => [...prev, newEdge])
            }
        },
    });

    const handleSendMessage = useCallback(async (msg: string) => {
        if (!msg.trim()) return;

        // Optimistic update
        setMessages(prev => [...prev, { sender: 'User', content: msg, type: 'human' }]);

        await sendMessage('/api/loop-creator/chat', {
            message: msg,
            projectId,
            threadId, // Continue conversation if we have a threadId
            context: { 
                ...gameContext,
                nodes: nodes.map(n => ({ id: n.id, label: n.data?.label, type: n.type })),
                edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, label: e.label })),
            }
        });
    }, [projectId, threadId, sendMessage, setMessages, nodes, edges, gameContext]);

    return (
        <div className="flex flex-col h-full bg-background text-foreground overflow-hidden font-sans">
            <div className="flex flex-1 overflow-hidden">
                {/* Main Content - React Flow Diagram */}
                <main className="flex flex-1 flex-col overflow-hidden relative">
                    <header className="flex h-14 items-center justify-between border-b px-6 bg-card/50">
                        <div className="flex items-center gap-4">
                            <h1 className="text-lg font-semibold">Loop Creator</h1>
                            {loopMetadata && (
                                <Badge variant="secondary" className="text-[10px] h-5">
                                    {loopMetadata.name} v{loopMetadata.version}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mr-4">
                                <span>{nodes.length} nodes</span>
                                <span>{edges.length} edges</span>
                                {groundingScore !== null && (
                                    <span className="text-emerald-500">
                                        Grounding: {Math.round(groundingScore * 100)}%
                                    </span>
                                )}
                            </div>
                            
                            {analysis && (
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="gap-2 h-8">
                                            <Info className="w-4 h-4" />
                                            Analysis
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl bg-[#0d0d14] border-slate-800 text-slate-200">
                                        <DialogHeader>
                                            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                                                <Sparkles className="w-5 h-5 text-cyan-400" />
                                                Loop Analysis: {loopMetadata?.name}
                                            </DialogTitle>
                                        </DialogHeader>
                                        <ScrollArea className="max-h-[70vh] pr-4">
                                            <div className="space-y-6 py-4">
                                                {analysis.coreInsight && (
                                                    <div className="p-4 rounded-lg bg-cyan-950/20 border border-cyan-500/30">
                                                        <p className="text-cyan-400 italic font-medium text-sm leading-relaxed">
                                                            "{analysis.coreInsight}"
                                                        </p>
                                                    </div>
                                                )}
                                                
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="space-y-4">
                                                        <h3 className="text-xs font-bold text-white uppercase tracking-widest text-slate-500">Five Pillars</h3>
                                                        <div className="space-y-4">
                                                            {analysis.pillarScores && Object.entries(analysis.pillarScores).map(([pillar, score]: [string, any]) => (
                                                                <div key={pillar} className="space-y-2">
                                                                    <div className="flex justify-between text-[10px] uppercase font-bold tracking-tight text-slate-400">
                                                                        <span>{pillar}</span>
                                                                        <span className="text-cyan-400">{score}/10</span>
                                                                    </div>
                                                                    <div className="h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/30">
                                                                        <div 
                                                                            className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-1000" 
                                                                            style={{ width: `${score * 10}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="space-y-4">
                                                        <h3 className="text-xs font-bold text-white uppercase tracking-widest text-slate-500">Key Innovations</h3>
                                                        <ul className="space-y-3">
                                                            {analysis.keyInnovations?.map((item: string, i: number) => (
                                                                <li key={i} className="text-xs text-slate-300 flex gap-3 leading-relaxed">
                                                                    <span className="text-cyan-500 font-bold">0{i+1}.</span> 
                                                                    <span>{item}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-800/50">
                                                    <div className="space-y-3">
                                                        <h3 className="text-xs font-bold text-white uppercase tracking-widest text-slate-500">Design Lessons</h3>
                                                        <ul className="space-y-2">
                                                            {analysis.designLessons?.map((item: string, i: number) => (
                                                                <li key={i} className="text-xs text-slate-300 flex gap-2 items-start">
                                                                    <span className="text-emerald-500 mt-0.5">💡</span>
                                                                    <span>{item}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <h3 className="text-xs font-bold text-white uppercase tracking-widest text-slate-500">Loop Strengths</h3>
                                                        <ul className="space-y-2">
                                                            {analysis.loopStrengths?.map((item: string, i: number) => (
                                                                <li key={i} className="text-xs text-slate-300 flex gap-2 items-start">
                                                                    <span className="text-blue-500 mt-0.5">✓</span>
                                                                    <span>{item}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </ScrollArea>
                                    </DialogContent>
                                </Dialog>
                            )}

                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="gap-2 h-8 border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-400"
                                onClick={handleTidyUp}
                            >
                                <Wand2 className="w-4 h-4" />
                                Tidy Up
                            </Button>

                            <div className="flex items-center">
                                <input 
                                    type="file" 
                                    id="json-import"
                                    accept=".json" 
                                    className="hidden" 
                                    onChange={onImportJson}
                                />
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="gap-2 bg-primary/10 border-primary/20 hover:bg-primary/20 transition-colors h-8"
                                    onClick={() => document.getElementById('json-import')?.click()}
                                >
                                    <Upload className="w-4 h-4" />
                                    Import JSON
                                </Button>
                            </div>
                        </div>
                    </header>
                    <div className="flex-1 overflow-hidden p-4 relative">
                        <div className="absolute inset-0 p-4">
                            <div className="h-full w-full rounded-xl border bg-card/50 shadow-inner overflow-hidden relative">
                                <div className="absolute inset-0 bg-slate-950/20">
                                    <ReactFlow
                                        nodes={nodes}
                                        edges={edges}
                                        onNodesChange={onNodesChange}
                                        onEdgesChange={onEdgesChange}
                                        onConnect={onConnect}
                                        onInit={setRfInstance}
                                        nodeTypes={nodeTypes}
                                        fitView
                                        className="bg-background"
                                    >
                                        <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#334155" />
                                        <Controls className="bg-muted text-muted-foreground border-border" />
                                    </ReactFlow>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* RIGHT Sidebar - Chat Interface */}
                <aside className="w-[420px] border-l border-border flex flex-col bg-card/30">
                    {/* Active Agents Display */}
                    {activeAgents.length > 0 && (
                        <div className="px-4 py-2 border-b bg-card/30">
                            <ActiveAgentsPanel 
                                activeAgents={activeAgents}
                                agentConfig={LOOP_AGENT_CONFIG}
                            />
                        </div>
                    )}
                    
                    {/* Section Progress */}
                    {streamingSections.length > 0 && (
                        <div className="px-4 py-2 border-b">
                            <SectionProgress 
                                sections={streamingSections}
                                title="Progress"
                                collapsible
                                defaultExpanded={false}
                            />
                        </div>
                    )}
                    
                    <div className="flex-1 overflow-hidden">
                        <ChatInterface
                            title="Loop Assistant"
                            messages={messages}
                            onSendMessage={handleSendMessage}
                            isSending={isSending}
                            agentConfig={LOOP_AGENT_CONFIG}
                            onStopStream={stopStream}
                            isActivityPanelOpen={isActivityPanelOpen}
                            onActivityToggle={() => setIsActivityPanelOpen(!isActivityPanelOpen)}
                        >
                            {/* Streaming Tokens Injection */}
                            {isTokenStreaming && streamingTokens && (
                                <div className="mb-4 animate-in fade-in duration-300">
                                    <div className="flex items-center gap-2 mb-1 text-primary">
                                        <div className="p-1 rounded bg-primary/10 border-primary/30">
                                            <Sparkles className="w-4 h-4" />
                                        </div>
                                        <span className="font-bold text-xs uppercase tracking-wider">
                                            {thinkingAgent || 'Processing'}
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-lg border bg-primary/5 border-primary/20 text-foreground/90 font-mono text-sm leading-relaxed whitespace-pre-wrap shadow-sm max-h-[300px] overflow-y-auto">
                                        {streamingTokens}
                                        <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse align-middle" />
                                    </div>
                                </div>
                            )}

                            {/* Smart Quick Actions */}
                            {!isSending && !isTokenStreaming && (
                                <div className="mt-4 border-t border-border/10 pt-4 px-4 pb-2">
                                    <div className="flex items-center gap-2 mb-1.5 px-1">
                                        <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-widest">Suggested</span>
                                    </div>
                                    <SmartQuickActions
                                        currentPhase="breaking" // Loop creator is mostly about breaking down mechanics
                                        onSendMessage={handleSendMessage}
                                        proposeLabel="Analyze loops"
                                        proposePrompt="Analyze the current game loops and suggest improvements or next steps."
                                    />
                                </div>
                            )}
                        </ChatInterface>
                    </div>
                </aside>
            </div>
        </div>
    );
}
