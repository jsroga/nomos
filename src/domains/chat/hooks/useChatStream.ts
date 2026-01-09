/**
 * useChatStream Hook
 * 
 * Enhanced chat streaming hook with support for:
 * - Token streaming
 * - Section progress tracking
 * - Agent status updates
 * - Citation events
 * - Grounding scores
 */

import { useState, useRef, useCallback } from 'react';
import { Message, AgentAction, AgentQuestion, QuestionSession } from '../types';
import { AgentStatusInfo, AgentStatus } from '../components/AgentLog';
import { Citation } from '../components/CitationDisplay';
import { ProgressSection } from '../components/SectionProgress';

interface UseChatStreamProps {
    initialMessages?: Message[];
    onAction?: (action: AgentAction) => Promise<void>;
    onQuestion?: (question: QuestionSession) => void;
    onStreamingUpdate?: (data: any) => void;
    onCitationsUpdate?: (citations: Citation[]) => void;
    onGroundingUpdate?: (score: number, details: any) => void;
}

export interface StreamState {
    // Core state
    messages: Message[];
    isSending: boolean;
    thinkingAgent: string | null;
    
    // Streaming state
    streamingTokens: string;
    isTokenStreaming: boolean;
    isAwaitingInput: boolean;
    
    // Progress tracking
    streamingSections: ProgressSection[];
    
    // Agent status
    activeAgents: AgentStatusInfo[];
    
    // Citations
    citations: Citation[];
    groundingScore: number | null;
    
    // Round tracking
    roundCount: number;
}

export function useChatStream({
    initialMessages = [],
    onAction,
    onQuestion,
    onStreamingUpdate,
    onCitationsUpdate,
    onGroundingUpdate,
}: UseChatStreamProps = {}) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [isSending, setIsSending] = useState(false);
    const [thinkingAgent, setThinkingAgent] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Streaming state
    const [streamingTokens, setStreamingTokens] = useState<string>('');
    const streamingTokensRef = useRef<string>('');
    const [streamingSections, setStreamingSections] = useState<ProgressSection[]>([]);
    const [isTokenStreaming, setIsTokenStreaming] = useState(false);
    const [isAwaitingInput, setIsAwaitingInput] = useState(false);

    // Agent status tracking
    const [activeAgents, setActiveAgents] = useState<AgentStatusInfo[]>([]);
    
    // Citation tracking
    const [citations, setCitations] = useState<Citation[]>([]);
    const [groundingScore, setGroundingScore] = useState<number | null>(null);

    // Track round count
    const [roundCount, setRoundCount] = useState(0);

    const stopStream = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsSending(false);
        setThinkingAgent(null);
        setIsTokenStreaming(false);
        setStreamingTokens('');
        setStreamingSections([]);
        setIsAwaitingInput(false);
        setActiveAgents([]);

        setMessages(prev => [
            ...prev,
            {
                sender: 'System',
                content: '⏹️ Stream stopped by user.',
                type: 'ai',
            },
        ]);
    }, []);

    /**
     * Update agent status
     */
    const updateAgentStatus = useCallback((
        agent: string,
        status: AgentStatus,
        message?: string,
        details?: string
    ) => {
        setActiveAgents(prev => {
            const existing = prev.find(a => a.agent === agent);
            
            // Remove if complete or error
            if (status === 'complete' || status === 'error' || status === 'idle') {
                return prev.filter(a => a.agent !== agent);
            }
            
            if (existing) {
                return prev.map(a => 
                    a.agent === agent 
                        ? { ...a, status, message, details }
                        : a
                );
            }
            
            return [...prev, {
                agent,
                status,
                message,
                details,
                startTime: Date.now(),
            }];
        });
    }, []);

    /**
     * Process section progress events
     */
    const processSectionEvent = useCallback((data: any) => {
        if (data.type === 'section_start') {
            setStreamingSections(prev => {
                const existing = prev.find(s => s.id === data.section);
                if (existing) {
                    return prev.map(s =>
                        s.id === data.section
                            ? { ...s, status: 'in_progress' as const, startTime: Date.now() }
                            : s
                    );
                }
                return [...prev, {
                    id: data.section,
                    label: data.label || data.section,
                    status: 'in_progress' as const,
                    startTime: Date.now(),
                }];
            });
        } else if (data.type === 'section_complete') {
            setStreamingSections(prev =>
                prev.map(s =>
                    s.id === data.section
                        ? { 
                            ...s, 
                            status: 'completed' as const, 
                            endTime: Date.now(),
                            details: data.preview || data.details,
                        }
                        : s
                )
            );
        } else if (data.type === 'section_error') {
            setStreamingSections(prev =>
                prev.map(s =>
                    s.id === data.section
                        ? { 
                            ...s, 
                            status: 'error' as const, 
                            endTime: Date.now(),
                            details: data.error,
                        }
                        : s
                )
            );
        }
    }, []);

    /**
     * Process citation events
     */
    const processCitationEvent = useCallback((data: any) => {
        if (data.type === 'citation' || data.type === 'citations') {
            const newCitations: Citation[] = Array.isArray(data.citations) 
                ? data.citations 
                : [data.citation];
            
            setCitations(prev => {
                const existingIds = new Set(prev.map(c => c.id));
                const unique = newCitations.filter(c => !existingIds.has(c.id));
                return [...prev, ...unique];
            });
            
            if (onCitationsUpdate) {
                onCitationsUpdate(newCitations);
            }
        } else if (data.type === 'grounding') {
            setGroundingScore(data.score);
            if (onGroundingUpdate) {
                onGroundingUpdate(data.score, data.details);
            }
        }
    }, [onCitationsUpdate, onGroundingUpdate]);

    const processStream = useCallback(async (
        res: Response,
        signal: AbortSignal,
        initialRoundCount: number = 0,
        pendingActionsRef?: React.MutableRefObject<number>
    ) => {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let localRoundCount = initialRoundCount;

        if (!reader) return;

        // Reset citations for new stream
        setCitations([]);
        setGroundingScore(null);

        try {
            while (true) {
                if (signal.aborted) {
                    reader.cancel();
                    break;
                }

                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            // Notify external listeners
                            if (onStreamingUpdate) onStreamingUpdate(data);

                            // Process by event type
                            if (data.type === 'start') {
                                setThinkingAgent('Processing');
                                setStreamingTokens('');
                                streamingTokensRef.current = '';
                                setStreamingSections([]);
                                setIsTokenStreaming(data.streamMode === 'events');
                                setCitations([]);
                                setGroundingScore(null);
                                
                            } else if (data.type === 'token') {
                                setStreamingTokens(prev => {
                                    const next = prev + (data.token || '');
                                    streamingTokensRef.current = next;
                                    return next;
                                });
                                
                            } else if (data.type === 'node' || data.type === 'node_start') {
                                const agentName = data.node || data.agent;
                                setThinkingAgent(agentName);
                                updateAgentStatus(agentName, 'thinking', 'Processing...');
                                
                            } else if (data.type === 'node_complete') {
                                const agentName = data.node || data.agent;
                                updateAgentStatus(agentName, 'complete');
                                setStreamingTokens('');
                                
                            } else if (data.type.startsWith('section_')) {
                                processSectionEvent(data);
                                
                            } else if (data.type === 'citation' || data.type === 'citations' || data.type === 'grounding') {
                                processCitationEvent(data);
                                
                            } else if (data.type === 'agent_status') {
                                updateAgentStatus(
                                    data.agent,
                                    data.status,
                                    data.message,
                                    data.details
                                );
                                
                            } else if (data.type === 'message') {
                                setThinkingAgent(data.node || data.agent);
                                setMessages(prev => {
                                    // Dedupe - add null checks for safety
                                    const exists = prev.some(existing =>
                                        existing?.sender === data.message?.sender &&
                                        existing?.content === data.message?.content &&
                                        existing?.type === data.message?.type &&
                                        data.message?.type !== 'system'
                                    );
                                    if (exists || !data.message) return prev;
                                    
                                    // Attach citations if available
                                    const messageWithCitations = {
                                        ...data.message,
                                        citations: data.citations || data.message.citations,
                                    };
                                    
                                    return [...prev, messageWithCitations];
                                });

                                if (data.message.type === 'ai') {
                                    localRoundCount++;
                                    setRoundCount(localRoundCount);
                                }
                                
                            } else if (data.type === 'action') {
                                if (onAction) {
                                    const promise = onAction(data.action);
                                    if (pendingActionsRef) pendingActionsRef.current++;
                                    promise.finally(() => {
                                        if (pendingActionsRef) pendingActionsRef.current--;
                                    });
                                }
                                
                            } else if (data.type === 'questions') {
                                if (onQuestion && data.questions && data.questions.length > 0) {
                                    data.questions.forEach((q: AgentQuestion) => {
                                        onQuestion({
                                            id: q.id,
                                            question: q,
                                            status: 'pending'
                                        });
                                    });

                                    if (data.questions.some((q: AgentQuestion) => q.urgency === 'blocking')) {
                                        setIsAwaitingInput(true);
                                    }
                                }
                                
                            } else if (data.type === 'awaiting_input') {
                                setIsAwaitingInput(true);
                                setThinkingAgent(null);
                                setIsTokenStreaming(false);
                                setStreamingTokens('');
                                
                            } else if (data.type === 'state') {
                                // State update from loop creator or similar
                                // Could emit this to external handler
                                if (onStreamingUpdate) onStreamingUpdate(data);
                                
                            } else if (data.type === 'complete' || data.type === 'done' || data.type === 'terminated') {
                                // Stream complete - clean up all state
                                setThinkingAgent(null);
                                setIsTokenStreaming(false);
                                setStreamingTokens('');
                                streamingTokensRef.current = '';
                                setStreamingSections([]);
                                setIsSending(false);
                                setActiveAgents([]);
                                setIsAwaitingInput(false);
                                
                            } else if (data.type === 'error') {
                                setMessages(prev => [...prev, {
                                    sender: 'System',
                                    content: `Error: ${data.message || data.error}`,
                                    type: 'ai'
                                }]);
                                // Ensure cleanup on error event
                                setThinkingAgent(null);
                                setIsTokenStreaming(false);
                                setStreamingTokens('');
                                streamingTokensRef.current = '';
                                setStreamingSections([]);
                                setIsSending(false);
                                setActiveAgents([]);
                                setIsAwaitingInput(false);
                            }
                        } catch (e) {
                            // ignore parse error
                        }
                    }
                }
            }
        } catch (error: any) {
            console.error("Stream error", error);
        } finally {
            // Try to parse any remaining tokens as action (only if not aborted)
            if (!signal.aborted && streamingTokensRef.current) {
                try {
                    const potentialJson = streamingTokensRef.current.trim();
                    if (potentialJson.startsWith('{') && potentialJson.endsWith('}')) {
                        const data = JSON.parse(potentialJson);
                        if (data.type && onAction) {
                            onAction(data);
                        }
                    }
                } catch (e) {
                    // Not JSON
                }
            }

            // ALWAYS clean up state, regardless of abort
            setThinkingAgent(null);
            setIsTokenStreaming(false);
            setStreamingTokens('');
            streamingTokensRef.current = '';
            setStreamingSections([]);
            setIsSending(false);
            setActiveAgents([]);
            setIsAwaitingInput(false);
        }
    }, [onAction, onQuestion, onStreamingUpdate, updateAgentStatus, processSectionEvent, processCitationEvent]);

    const sendMessage = useCallback(async (
        endpoint: string,
        payload: any,
        customHeaders: Record<string, string> = {}
    ) => {
        setIsSending(true);
        abortControllerRef.current = new AbortController();

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...customHeaders },
                body: JSON.stringify(payload),
                signal: abortControllerRef.current.signal,
            });
            await processStream(res, abortControllerRef.current.signal, roundCount);
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error("Failed to send message:", error);
                setMessages(prev => [...prev, {
                    sender: 'System',
                    content: 'Failed to send message. Please try again.',
                    type: 'system'
                }]);
            }
            // Always clean up on any error (including AbortError)
            setIsSending(false);
            setThinkingAgent(null);
            setIsTokenStreaming(false);
            setStreamingTokens('');
            setActiveAgents([]);
        }
    }, [processStream, roundCount]);

    /**
     * Clear citations
     */
    const clearCitations = useCallback(() => {
        setCitations([]);
        setGroundingScore(null);
    }, []);

    return {
        // Core state
        messages,
        setMessages,
        isSending,
        setIsSending,
        thinkingAgent,
        
        // Actions
        stopStream,
        sendMessage,
        processStream,
        clearCitations,
        
        // Streaming state
        streamingTokens,
        streamingSections,
        isTokenStreaming,
        isAwaitingInput,
        setIsAwaitingInput,
        
        // Agent status
        activeAgents,
        updateAgentStatus,
        
        // Citations
        citations,
        groundingScore,
        
        // Refs
        abortControllerRef,
        
        // Round tracking
        roundCount,
    };
}

export default useChatStream;
