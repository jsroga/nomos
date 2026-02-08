/**
 * AI Ghost-Text Inline Completion (S3)
 *
 * Cursor-like inline completion for the ScriptEditor.
 * Shows dimmed continuation text that the user can Tab to accept.
 *
 * - Triggers after 500ms of no typing
 * - Uses gpt-4o-mini for speed (<800ms to first token)
 * - Tab to accept, any other key to dismiss
 * - Max 150 tokens output
 */

'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export interface GhostTextConfig {
    /** API endpoint for autocomplete */
    apiEndpoint: string
    /** Debounce delay in ms */
    debounceMs: number
    /** Max chars of script to send as context */
    contextChars: number
    /** Characters in the project (for context injection) */
    characters: Array<{ name: string; role: string }>
    /** Current scene heading */
    currentScene?: string
    /** Project ID */
    projectId: string
}

const DEFAULT_CONFIG: Partial<GhostTextConfig> = {
    apiEndpoint: '/api/storyteller/autocomplete',
    debounceMs: 500,
    contextChars: 500,
}

export interface GhostTextState {
    /** The ghost text to display */
    text: string
    /** Whether a request is in flight */
    loading: boolean
    /** Position in the editor where ghost text starts */
    insertPosition: number
}

/**
 * Hook for managing ghost-text inline completions.
 *
 * Usage:
 * ```tsx
 * const { ghostText, acceptGhostText, dismissGhostText, onContentChange } = useGhostText(config)
 * ```
 */
export function useGhostText(config: GhostTextConfig) {
    const [ghostText, setGhostText] = useState<GhostTextState>({
        text: '',
        loading: false,
        insertPosition: 0,
    })

    const debounceTimer = useRef<NodeJS.Timeout | null>(null)
    const abortController = useRef<AbortController | null>(null)

    const mergedConfig = { ...DEFAULT_CONFIG, ...config }

    /**
     * Dismiss the current ghost text.
     */
    const dismissGhostText = useCallback(() => {
        setGhostText({ text: '', loading: false, insertPosition: 0 })
        if (abortController.current) {
            abortController.current.abort()
            abortController.current = null
        }
    }, [])

    /**
     * Accept the ghost text (insert it into the editor).
     * Returns the text to insert, or null if no ghost text.
     */
    const acceptGhostText = useCallback((): string | null => {
        if (!ghostText.text) return null
        const text = ghostText.text
        setGhostText({ text: '', loading: false, insertPosition: 0 })
        return text
    }, [ghostText.text])

    /**
     * Called when content changes in the editor.
     * Debounces and triggers a ghost-text request.
     */
    const onContentChange = useCallback((
        fullText: string,
        cursorPosition: number
    ) => {
        // Dismiss existing ghost text on any edit
        dismissGhostText()

        // Clear existing timer
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current)
        }

        // Set new debounce timer
        debounceTimer.current = setTimeout(async () => {
            // Only trigger if cursor is near end of content (not editing middle)
            const distanceFromEnd = fullText.length - cursorPosition
            if (distanceFromEnd > 20) return

            // Get last N chars as context
            const contextStart = Math.max(0, cursorPosition - mergedConfig.contextChars!)
            const scriptContext = fullText.slice(contextStart, cursorPosition)

            if (scriptContext.trim().length < 10) return

            // Abort previous request
            if (abortController.current) {
                abortController.current.abort()
            }

            const controller = new AbortController()
            abortController.current = controller

            setGhostText(prev => ({ ...prev, loading: true, insertPosition: cursorPosition }))

            try {
                const response = await fetch(mergedConfig.apiEndpoint!, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        scriptContext,
                        characters: mergedConfig.characters,
                        currentScene: mergedConfig.currentScene,
                        projectId: mergedConfig.projectId,
                    }),
                    signal: controller.signal,
                })

                if (!response.ok || !response.body) {
                    setGhostText({ text: '', loading: false, insertPosition: 0 })
                    return
                }

                // Stream the response
                const reader = response.body.getReader()
                const decoder = new TextDecoder()
                let accumulated = ''

                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    accumulated += decoder.decode(value, { stream: true })
                    setGhostText({
                        text: accumulated,
                        loading: false,
                        insertPosition: cursorPosition,
                    })
                }
            } catch (e: any) {
                if (e.name !== 'AbortError') {
                    console.error('[GhostText] Error:', e)
                }
                setGhostText({ text: '', loading: false, insertPosition: 0 })
            }
        }, mergedConfig.debounceMs)
    }, [mergedConfig, dismissGhostText])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current)
            if (abortController.current) abortController.current.abort()
        }
    }, [])

    return {
        ghostText,
        acceptGhostText,
        dismissGhostText,
        onContentChange,
    }
}
