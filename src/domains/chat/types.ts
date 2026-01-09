import { ReactNode } from 'react';

// Message types
export interface Message {
    sender?: string;
    name?: string;
    content: string;
    type?: 'human' | 'ai' | 'system';
    actions?: AgentAction[];
    questions?: AgentQuestion[];
    thinking?: string;
    confidence?: number;
    id?: string;
    timestamp?: Date;
}

// Agent Configuration
export interface AgentConfig {
    color: string;
    bgColor: string;
    icon: ReactNode;
}

export type AgentConfigMap = Record<string, AgentConfig>;

// Action & Question types (mirrored from storyteller for now, but made generic)
export interface AgentAction {
    type: string;
    payload: any;
    reasoning?: string;
}

export interface AgentQuestion {
    id: string;
    question: string;
    options?: string[];
    urgency?: 'blocking' | 'normal';
    context?: string;
}

// Stream Event Types
export type StreamEventType =
    | 'start'
    | 'token'
    | 'section_start'
    | 'section_complete'
    | 'node_start'
    | 'node_complete'
    | 'message'
    | 'action'
    | 'questions'
    | 'awaiting_input'
    | 'done'
    | 'terminated'
    | 'error';

export interface StreamEvent {
    type: StreamEventType;
    [key: string]: any;
}

export interface QuestionSession {
    id: string;
    question: AgentQuestion;
    status: 'pending' | 'answered' | 'skipped';
    answer?: string | string[];
}
