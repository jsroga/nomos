

// ==========================================
// MULTI-AGENT COORDINATION PROTOCOL
// ==========================================
// Enables agents to delegate tasks to each other.
// Implements a simple message-passing protocol.

export interface AgentMessage {
    id: string
    from: string
    to: string
    type: 'delegate' | 'result' | 'query' | 'broadcast'
    payload: unknown
    timestamp: Date
    correlationId?: string // For tracking request/response pairs
}

export interface AgentRegistration {
    id: string
    name: string
    capabilities: string[]
    status: 'idle' | 'busy' | 'offline'
}

export class AgentCoordinator {
    private agents: Map<string, AgentRegistration> = new Map()
    private messageQueue: AgentMessage[] = []
    private handlers: Map<string, (msg: AgentMessage) => Promise<unknown>> = new Map()

    /**
     * Register an agent with its capabilities.
     */
    register(agent: AgentRegistration): void {
        this.agents.set(agent.id, agent)
        console.log(`📡 Agent registered: ${agent.name} (${agent.capabilities.join(', ')})`)
    }

    /**
     * Unregister an agent.
     */
    unregister(agentId: string): void {
        this.agents.delete(agentId)
    }

    /**
     * Find agents that can handle a capability.
     */
    findByCapability(capability: string): AgentRegistration[] {
        return Array.from(this.agents.values())
            .filter(a => a.capabilities.includes(capability) && a.status !== 'offline')
    }

    /**
     * Send a delegation request to another agent.
     */
    async delegate(from: string, to: string, task: unknown): Promise<string> {
        const msg: AgentMessage = {
            id: crypto.randomUUID(),
            from,
            to,
            type: 'delegate',
            payload: task,
            timestamp: new Date()
        }

        this.messageQueue.push(msg)
        this.updateStatus(to, 'busy')

        // Process if handler exists
        const handler = this.handlers.get(to)
        if (handler) {
            try {
                const result = await handler(msg)
                await this.sendResult(to, from, result, msg.id)
            } catch (e) {
                await this.sendResult(to, from, { error: String(e) }, msg.id)
            }
        }

        return msg.id
    }

    /**
     * Send result back to requesting agent.
     */
    private async sendResult(from: string, to: string, result: unknown, correlationId: string): Promise<void> {
        const msg: AgentMessage = {
            id: crypto.randomUUID(),
            from,
            to,
            type: 'result',
            payload: result,
            timestamp: new Date(),
            correlationId
        }

        this.messageQueue.push(msg)
        this.updateStatus(from, 'idle')

        const handler = this.handlers.get(to)
        if (handler) {
            await handler(msg)
        }
    }

    /**
     * Broadcast a message to all agents.
     */
    broadcast(from: string, payload: unknown): void {
        for (const agent of this.agents.values()) {
            if (agent.id !== from) {
                this.messageQueue.push({
                    id: crypto.randomUUID(),
                    from,
                    to: agent.id,
                    type: 'broadcast',
                    payload,
                    timestamp: new Date()
                })
            }
        }
    }

    /**
     * Register a handler for incoming messages.
     */
    onMessage(agentId: string, handler: (msg: AgentMessage) => Promise<unknown>): void {
        this.handlers.set(agentId, handler)
    }

    /**
     * Get pending messages for an agent.
     */
    getMessages(agentId: string): AgentMessage[] {
        return this.messageQueue.filter(m => m.to === agentId)
    }

    /**
     * Update agent status.
     */
    private updateStatus(agentId: string, status: AgentRegistration['status']): void {
        const agent = this.agents.get(agentId)
        if (agent) {
            agent.status = status
        }
    }

    /**
     * Get all registered agents.
     */
    getAgents(): AgentRegistration[] {
        return Array.from(this.agents.values())
    }
}

// ==========================================
// TRACE LINEAGE
// ==========================================
// Full audit trail from goal → plan → actions → outcomes.

export interface TraceSpan {
    id: string
    parentId?: string
    name: string
    startTime: Date
    endTime?: Date
    status: 'running' | 'success' | 'error'
    metadata: Record<string, unknown>
    events: TraceEvent[]
}

export interface TraceEvent {
    timestamp: Date
    type: 'plan_created' | 'task_started' | 'task_completed' | 'tool_called' | 'user_input' | 'error'
    data: unknown
}

export class TraceLineage {
    private spans: Map<string, TraceSpan> = new Map()
    private currentSpanId: string | null = null

    /**
     * Start a new trace span.
     */
    startSpan(name: string, metadata: Record<string, unknown> = {}): string {
        const span: TraceSpan = {
            id: crypto.randomUUID(),
            parentId: this.currentSpanId || undefined,
            name,
            startTime: new Date(),
            status: 'running',
            metadata,
            events: []
        }

        this.spans.set(span.id, span)
        this.currentSpanId = span.id

        return span.id
    }

    /**
     * End the current span.
     */
    endSpan(success: boolean = true): void {
        if (!this.currentSpanId) return

        const span = this.spans.get(this.currentSpanId)
        if (span) {
            span.endTime = new Date()
            span.status = success ? 'success' : 'error'
            this.currentSpanId = span.parentId || null
        }
    }

    /**
     * Add an event to the current span.
     */
    addEvent(type: TraceEvent['type'], data: unknown): void {
        if (!this.currentSpanId) return

        const span = this.spans.get(this.currentSpanId)
        if (span) {
            span.events.push({
                timestamp: new Date(),
                type,
                data
            })
        }
    }

    /**
     * Get the full lineage of a span.
     */
    getLineage(spanId: string): TraceSpan[] {
        const lineage: TraceSpan[] = []
        let current = this.spans.get(spanId)

        while (current) {
            lineage.unshift(current)
            current = current.parentId ? this.spans.get(current.parentId) : undefined
        }

        return lineage
    }

    /**
     * Export all traces for analysis.
     */
    export(): TraceSpan[] {
        return Array.from(this.spans.values())
    }

    /**
     * Generate a summary report.
     */
    getSummary(): {
        totalSpans: number
        successRate: number
        avgDurationMs: number
        eventCounts: Record<string, number>
    } {
        const spans = Array.from(this.spans.values())
        const completed = spans.filter(s => s.endTime)
        const successful = completed.filter(s => s.status === 'success')

        const durations = completed.map(s =>
            (s.endTime!.getTime() - s.startTime.getTime())
        )

        const eventCounts: Record<string, number> = {}
        for (const span of spans) {
            for (const event of span.events) {
                eventCounts[event.type] = (eventCounts[event.type] || 0) + 1
            }
        }

        return {
            totalSpans: spans.length,
            successRate: completed.length > 0 ? successful.length / completed.length : 0,
            avgDurationMs: durations.length > 0
                ? durations.reduce((a, b) => a + b, 0) / durations.length
                : 0,
            eventCounts
        }
    }
}
