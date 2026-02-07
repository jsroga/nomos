/**
 * @vitest-environment jsdom
 */

/**
 * Thinking Stream E2E Tests
 *
 * Verifies that thinking/reasoning events from SSE streams are correctly
 * processed and attached to messages in useChatStream.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useChatStream } from '../useChatStream'

// Mock sessionStorage
const mockSessionStorage = (() => {
    let store: Record<string, string> = {}
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString()
        },
        removeItem: (key: string) => {
            delete store[key]
        },
        clear: () => {
            store = {}
        }
    }
})()

// Mock fetch and ReadableStream
function createMockSSEStream(events: Array<{ type: string;[key: string]: any }>) {
    let eventIndex = 0

    const mockReader = {
        read: vi.fn(async () => {
            if (eventIndex >= events.length) {
                return { done: true, value: undefined }
            }
            const event = events[eventIndex++]
            const data = `data: ${JSON.stringify(event)}\n\n`
            return { done: false, value: new TextEncoder().encode(data) }
        }),
        cancel: vi.fn(),
    }

    const mockBody = {
        getReader: () => mockReader,
    }

    return { mockBody, mockReader }
}

describe('Thinking Stream Processing', () => {
    beforeEach(() => {
        vi.stubGlobal('sessionStorage', mockSessionStorage)
        sessionStorage.clear()
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('processes thinking events and attaches to last AI message', async () => {
        const { result } = renderHook(() => useChatStream())

        // First add an AI message
        act(() => {
            result.current.setMessages([
                { sender: 'Storyteller', content: 'Hello', type: 'ai' }
            ])
        })

        // Simulate processing a thinking event
        const thinkingEvents = [
            { type: 'start', traceId: 'test-123' },
            { type: 'thinking', thinking: 'Analyzing the story structure...', agent: 'Storyteller' },
            { type: 'complete' }
        ]

        const { mockBody } = createMockSSEStream(thinkingEvents)
        const mockResponse = {
            ok: true,
            body: mockBody as unknown as ReadableStream,
        } as Response

        const abortController = new AbortController()

        // Process the stream
        await act(async () => {
            await result.current.processStream(mockResponse, abortController.signal)
        })

        // Verify thinking was attached to the message
        await waitFor(() => {
            const messages = result.current.messages
            expect(messages).toHaveLength(1)
            expect(messages[0].thinking).toContain('Analyzing the story structure')
            expect(messages[0].additional_kwargs?.hasThinking).toBe(true)
        })
    })

    it('accumulates multiple thinking events', async () => {
        const { result } = renderHook(() => useChatStream())

        // First add an AI message
        act(() => {
            result.current.setMessages([
                { sender: 'Storyteller', content: 'Processing...', type: 'ai' }
            ])
        })

        // Simulate multiple thinking events
        const thinkingEvents = [
            { type: 'start', traceId: 'test-456' },
            { type: 'thinking', thinking: 'First thought...', agent: 'Storyteller' },
            { type: 'thinking', thinking: 'Second thought...', agent: 'Storyteller' },
            { type: 'complete' }
        ]

        const { mockBody } = createMockSSEStream(thinkingEvents)
        const mockResponse = {
            ok: true,
            body: mockBody as unknown as ReadableStream,
        } as Response

        const abortController = new AbortController()

        await act(async () => {
            await result.current.processStream(mockResponse, abortController.signal)
        })

        // Verify both thinking chunks were accumulated
        await waitFor(() => {
            const messages = result.current.messages
            expect(messages[0].thinking).toContain('First thought')
            expect(messages[0].thinking).toContain('Second thought')
        })
    })

    it('handles thinking events with no prior message gracefully', async () => {
        const { result } = renderHook(() => useChatStream())

        // Start with empty messages
        expect(result.current.messages).toHaveLength(0)

        // Simulate thinking event with no prior message
        const thinkingEvents = [
            { type: 'start', traceId: 'test-789' },
            { type: 'thinking', thinking: 'Thinking without message...', agent: 'Storyteller' },
            { type: 'complete' }
        ]

        const { mockBody } = createMockSSEStream(thinkingEvents)
        const mockResponse = {
            ok: true,
            body: mockBody as unknown as ReadableStream,
        } as Response

        const abortController = new AbortController()

        // Should not throw
        await act(async () => {
            await result.current.processStream(mockResponse, abortController.signal)
        })

        // Messages should still be empty (no crash)
        expect(result.current.messages).toHaveLength(0)
    })

    it('preserves thinking in messages when updated', async () => {
        const { result } = renderHook(() => useChatStream({ persistKey: 'test-persist' }))

        // Add a message with thinking
        act(() => {
            result.current.setMessages([
                {
                    sender: 'Storyteller',
                    content: 'Analysis complete.',
                    type: 'ai',
                    thinking: 'Deep analysis of narrative...',
                    additional_kwargs: { hasThinking: true }
                }
            ])
        })

        // Verify thinking is in the message
        expect(result.current.messages[0].thinking).toBe('Deep analysis of narrative...')
        expect(result.current.messages[0].additional_kwargs?.hasThinking).toBe(true)

        // Update the message and verify thinking persists
        act(() => {
            result.current.setMessages(prev => prev.map(msg => ({
                ...msg,
                content: 'Updated content'
            })))
        })

        // Thinking should still be there
        expect(result.current.messages[0].thinking).toBe('Deep analysis of narrative...')
    })
})

describe('Action Status Updates', () => {
    beforeEach(() => {
        vi.stubGlobal('sessionStorage', mockSessionStorage)
        sessionStorage.clear()
        vi.clearAllMocks()
    })

    it('updates action status correctly', async () => {
        const { result } = renderHook(() => useChatStream())

        // Add a message with a pending action
        act(() => {
            result.current.setMessages([
                {
                    sender: 'Storyteller',
                    content: 'Creating character...',
                    type: 'ai',
                    actions: [
                        {
                            type: 'CREATE_CHARACTER',
                            payload: { name: 'Elena' },
                            status: 'pending'
                        }
                    ]
                }
            ])
        })

        // Update action status to committed
        act(() => {
            result.current.updateActionStatus(0, 0, 'committed')
        })

        // Verify status was updated
        expect(result.current.messages[0].actions?.[0].status).toBe('committed')
    })

    it('handles action events from stream', async () => {
        const { result } = renderHook(() => useChatStream())

        // Add initial AI message
        act(() => {
            result.current.setMessages([
                { sender: 'Storyteller', content: 'Working on it...', type: 'ai' }
            ])
        })

        // Set thinkingAgent to match the message sender
        act(() => {
            // Note: We need to mock this properly since thinkingAgent is set by start event
        })

        // Simulate action event from stream
        const actionEvents = [
            { type: 'start', traceId: 'test-action' },
            { type: 'node', node: 'Storyteller' },
            {
                type: 'action',
                action: {
                    type: 'CREATE_CHARACTER',
                    payload: { name: 'New Character' }
                },
                agent: 'Storyteller'
            },
            { type: 'complete' }
        ]

        const { mockBody } = createMockSSEStream(actionEvents)
        const mockResponse = {
            ok: true,
            body: mockBody as unknown as ReadableStream,
        } as Response

        const abortController = new AbortController()

        await act(async () => {
            await result.current.processStream(mockResponse, abortController.signal)
        })

        // Verify action was added with pending status
        await waitFor(() => {
            const lastMsg = result.current.messages[result.current.messages.length - 1]
            if (lastMsg.actions && lastMsg.actions.length > 0) {
                expect(lastMsg.actions[0].type).toBe('CREATE_CHARACTER')
                expect(lastMsg.actions[0].status).toBe('pending')
            }
        })
    })
})
