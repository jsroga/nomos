// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AgentLog } from '../AgentLog'
import React from 'react'

// Mock icons
vi.mock('lucide-react', () => ({
    Brain: () => <div data-testid="icon-brain" />,
    Loader2: () => <div data-testid="icon-loader" />,
    CheckCircle2: () => <div data-testid="icon-check" />,
    AlertCircle: () => <div data-testid="icon-alert" />,
    Clock: () => <div data-testid="icon-clock" />,
    ChevronDown: () => <div data-testid="icon-chevron-down" />,
    ChevronRight: () => <div data-testid="icon-chevron-right" />,
    Bot: () => <div data-testid="icon-bot" />,
    User: () => <div data-testid="icon-user" />,
    Zap: () => <div data-testid="icon-zap" />,
    Scroll: () => <div data-testid="icon-scroll" />,
    Check: () => <div data-testid="icon-check-simple" />,
    Palette: () => <div data-testid="icon-palette" />,
    MapPin: () => <div data-testid="icon-map-pin" />,
    Calendar: () => <div data-testid="icon-calendar" />,
    Users: () => <div data-testid="icon-users" />,
    Film: () => <div data-testid="icon-film" />,
    BookOpen: () => <div data-testid="icon-book-open" />,
}))

describe('AgentLog UI', () => {
    beforeAll(() => {
        vi.stubGlobal('matchMedia', vi.fn((query) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(), // deprecated
            removeListener: vi.fn(), // deprecated
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })))

        // Also mock scrollIntoView which is often needed
        Element.prototype.scrollIntoView = vi.fn()
    })

    it('should display active operation details in the header', () => {
        const activeOperations = [
            { id: '1', type: 'tool', label: 'Generating plot twist', startTime: Date.now() },
            { id: '2', type: 'tool', label: 'Analyzing unexpected event', startTime: Date.now() }
        ]

        render(
            <AgentLog
                messages={[]}
                agentConfig={{}}
                isSending={true}
                isActivityPanelOpen={true}
                currentPhase="Premise"
                activeOperations={activeOperations}
            />
        )

        // Check if the phase is displayed
        expect(screen.getByText('Premise')).toBeDefined()

        // Check if operation labels are displayed (appears in header and list)
        expect(screen.getAllByText(/Generating plot twist/).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/Analyzing unexpected event/).length).toBeGreaterThan(0)
    })
})
