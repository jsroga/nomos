/**
 * @vitest-environment jsdom
 */

/**
 * AgentLog Feature E2E Tests
 *
 * Verifies core AgentLog features:
 * 1. Agent thinking visibility when Activity panel is ON
 * 2. Accept/reject prompt positioning (below message content)
 * 3. Action states - pending shows ActionSuggestion, committed shows ActionCommitted
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AgentLog, Message } from '../AgentLog'

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

// Mock lucide-react icons with all required icons
vi.mock('lucide-react', async importOriginal => {
  const actual = await importOriginal<typeof import('lucide-react')>()
  const createMockIcon = (name: string) => {
    const Icon = ({ className }: { className?: string }) => (
      <span data-testid={`icon-${name.toLowerCase()}`} className={className}>
        {name}
      </span>
    )
    Icon.displayName = name
    return Icon
  }
  return {
    ...actual,
    Bot: createMockIcon('Bot'),
    User: createMockIcon('User'),
    Sparkles: createMockIcon('Sparkles'),
    Brain: createMockIcon('Brain'),
    Lightbulb: createMockIcon('Lightbulb'),
    Scale: createMockIcon('Scale'),
    Eye: createMockIcon('Eye'),
    Pen: createMockIcon('Pen'),
    ChevronDown: createMockIcon('ChevronDown'),
    ChevronRight: createMockIcon('ChevronRight'),
    Loader2: createMockIcon('Loader2'),
    Check: createMockIcon('Check'),
    X: createMockIcon('X'),
    Undo2: createMockIcon('Undo2'),
    MessageCircleQuestion: createMockIcon('MessageCircleQuestion'),
    AlertTriangle: createMockIcon('AlertTriangle'),
    History: createMockIcon('History'),
    Clock: createMockIcon('Clock'),
  }
})

describe('AgentLog Features', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Agent Thinking Visibility', () => {
    const messageWithThinking: Message[] = [
      {
        sender: 'Storyteller',
        content: 'I analyzed your story and found some interesting patterns.',
        type: 'ai',
        thinking:
          'Let me think about the narrative structure... The protagonist needs a stronger arc.',
      },
    ]

    it('shows thinking when both showThinking and isActivityPanelOpen are true', () => {
      render(
        <AgentLog messages={messageWithThinking} showThinking={true} isActivityPanelOpen={true} />
      )

      // Thinking content should be visible
      expect(screen.getByText(/Let me think about the narrative structure/)).toBeTruthy()
      // Main message should also be visible
      expect(screen.getByText(/I analyzed your story/)).toBeTruthy()
    })

    it('hides thinking when showThinking is false', () => {
      render(
        <AgentLog messages={messageWithThinking} showThinking={false} isActivityPanelOpen={true} />
      )

      // Thinking should NOT be visible
      expect(screen.queryByText(/Let me think about the narrative structure/)).toBeNull()
      // Main message should still be visible
      expect(screen.getByText(/I analyzed your story/)).toBeTruthy()
    })

    it('hides thinking when isActivityPanelOpen is false', () => {
      render(
        <AgentLog messages={messageWithThinking} showThinking={true} isActivityPanelOpen={false} />
      )

      // Thinking should NOT be visible when Activity panel is closed
      expect(screen.queryByText(/Let me think about the narrative structure/)).toBeNull()
      // Main message should still be visible
      expect(screen.getByText(/I analyzed your story/)).toBeTruthy()
    })

    it('supports extended thinking from additional_kwargs', () => {
      const messageWithExtendedThinking: Message[] = [
        {
          sender: 'Storyteller',
          content: 'Here is my detailed analysis.',
          type: 'ai',
          additional_kwargs: {
            thinking: 'Extended thinking: Analyzing character motivations...',
            hasThinking: true,
            extendedThinkingEnabled: true,
          },
        },
      ]

      render(
        <AgentLog
          messages={messageWithExtendedThinking}
          showThinking={true}
          isActivityPanelOpen={true}
        />
      )

      // Extended thinking should be visible
      expect(screen.getByText(/Extended thinking: Analyzing character motivations/)).toBeTruthy()
      // Should show the extended thinking label
      expect(screen.getByText(/Extended Thinking/)).toBeTruthy()
    })
  })

  describe('Accept/Reject Prompt Positioning', () => {
    const mockOnAccept = vi.fn()
    const mockOnReject = vi.fn()
    const mockOnReview = vi.fn()

    const messageWithPendingAction: Message[] = [
      {
        sender: 'Storyteller',
        content: 'I would like to create a new character for your story.',
        type: 'ai',
        actions: [
          {
            type: 'CREATE_CHARACTER',
            payload: { name: 'Elena', role: 'protagonist' },
            status: 'pending',
            confidence: 0.9,
          },
        ],
      },
    ]

    it('renders ActionSuggestion for pending actions with accept/reject buttons', () => {
      render(
        <AgentLog
          messages={messageWithPendingAction}
          onActionAccept={mockOnAccept}
          onActionReject={mockOnReject}
          onActionReview={mockOnReview}
        />
      )

      // Message content should be visible
      expect(screen.getByText(/I would like to create a new character/)).toBeTruthy()

      // Accept button should be present
      expect(screen.getByRole('button', { name: /accept/i })).toBeTruthy()
      // Discard/Reject button should be present
      expect(screen.getByRole('button', { name: /discard/i })).toBeTruthy()
      // Review button should be present
      expect(screen.getByRole('button', { name: /review/i })).toBeTruthy()
    })

    it('calls onActionAccept when Accept button is clicked', () => {
      render(
        <AgentLog
          messages={messageWithPendingAction}
          onActionAccept={mockOnAccept}
          onActionReject={mockOnReject}
          onActionReview={mockOnReview}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /accept/i }))

      // Should call with message index 0, action index 0
      expect(mockOnAccept).toHaveBeenCalledWith(0, 0)
    })

    it('calls onActionReject when Discard button is clicked', () => {
      render(
        <AgentLog
          messages={messageWithPendingAction}
          onActionAccept={mockOnAccept}
          onActionReject={mockOnReject}
          onActionReview={mockOnReview}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /discard/i }))

      // Should call with message index 0, action index 0
      expect(mockOnReject).toHaveBeenCalledWith(0, 0)
    })

    it('renders ActionCommitted for committed actions (no accept/reject buttons)', () => {
      const messageWithCommittedAction: Message[] = [
        {
          sender: 'Storyteller',
          content: 'Character created successfully.',
          type: 'ai',
          actions: [
            {
              type: 'CREATE_CHARACTER',
              payload: { name: 'Elena', role: 'protagonist' },
              status: 'committed',
            },
          ],
        },
      ]

      render(
        <AgentLog
          messages={messageWithCommittedAction}
          onActionAccept={mockOnAccept}
          onActionReject={mockOnReject}
        />
      )

      // Message content should be visible
      expect(screen.getByText(/Character created successfully/)).toBeTruthy()

      // Committed indicator should be visible
      expect(screen.getByText(/committed/i)).toBeTruthy()

      // Accept/Discard buttons should NOT be present for committed actions
      expect(screen.queryByRole('button', { name: /accept/i })).toBeNull()
      expect(screen.queryByRole('button', { name: /discard/i })).toBeNull()
    })

    it('renders actions AFTER message content (correct positioning)', () => {
      const { container } = render(
        <AgentLog
          messages={messageWithPendingAction}
          onActionAccept={mockOnAccept}
          onActionReject={mockOnReject}
          onActionReview={mockOnReview}
        />
      )

      // Find the message content and action elements
      const messageContent = screen.getByText(/I would like to create a new character/)
      const acceptButton = screen.getByRole('button', { name: /accept/i })

      // Check DOM order - actions should come after message content
      const messageDiv = messageContent.closest('div')
      const actionsContainer = acceptButton.closest('div[class*="mt-3"]')

      // Actions container should come after message content in DOM
      if (messageDiv && actionsContainer) {
        const allElements = Array.from(container.querySelectorAll('*'))
        const messageIndex = allElements.indexOf(messageDiv)
        const actionsIndex = allElements.indexOf(actionsContainer)
        expect(actionsIndex).toBeGreaterThan(messageIndex)
      }
    })
  })

  describe('Delegation Message Handling', () => {
    const delegationMessages: Message[] = [
      {
        sender: 'Supervisor',
        content: 'Delegating to PremiseArchitect...',
        type: 'ai',
      },
      {
        sender: 'delegate_to_premise_architect',
        content: 'Processing premise...',
        type: 'ai',
      },
    ]

    it('hides delegation messages when Activity panel is closed', () => {
      render(<AgentLog messages={delegationMessages} isActivityPanelOpen={false} />)

      // Delegation messages should be hidden
      expect(screen.queryByText(/Delegating to/)).toBeNull()
      expect(screen.queryByText(/Processing premise/)).toBeNull()
    })

    it('shows delegation messages as collapsible when Activity panel is open', () => {
      render(<AgentLog messages={delegationMessages} isActivityPanelOpen={true} />)

      // Should show the collapsed delegation chain indicator
      expect(screen.getByText(/Process: 2 steps/)).toBeTruthy()
    })

    it('expands delegation chain when clicked', () => {
      render(<AgentLog messages={delegationMessages} isActivityPanelOpen={true} />)

      // Click to expand
      const expandButton = screen.getByText(/Process: 2 steps/)
      fireEvent.click(expandButton)

      // Now individual delegation messages should be visible
      expect(screen.getByText(/Delegating to PremiseArchitect/)).toBeTruthy()
    })
  })

  describe('Questions Rendering', () => {
    const mockOnAnswer = vi.fn()
    const mockOnSkip = vi.fn()

    const messageWithQuestion: Message[] = [
      {
        sender: 'Storyteller',
        content: 'I have a question about your story.',
        type: 'ai',
        questions: [
          {
            id: 'q1',
            agentName: 'Storyteller',
            question: 'What genre should we focus on?',
            questionType: 'single_choice',
            urgency: 'important',
            options: [
              { id: 'fantasy', label: 'Fantasy' },
              { id: 'scifi', label: 'Sci-Fi' },
            ],
          },
        ],
      },
    ]

    it('renders questions after message content', () => {
      render(
        <AgentLog
          messages={messageWithQuestion}
          onQuestionAnswer={mockOnAnswer}
          onQuestionSkip={mockOnSkip}
        />
      )

      // Message content should be visible
      expect(screen.getByText(/I have a question about your story/)).toBeTruthy()

      // Question should be visible
      expect(screen.getByText(/What genre should we focus on/)).toBeTruthy()
    })
  })

  describe('Agent Display Names', () => {
    it('shows friendly display names for known agents', () => {
      const messages: Message[] = [
        {
          sender: 'CharacterPsychology',
          content: 'Analyzing character motivation.',
          type: 'ai',
        },
      ]

      render(<AgentLog messages={messages} />)

      // Should show "Character Expert" instead of "CharacterPsychology"
      expect(screen.getByText(/Character Expert/i)).toBeTruthy()
    })

    it('converts camelCase agent names to Title Case', () => {
      const messages: Message[] = [
        {
          sender: 'MyCustomAgent',
          content: 'Custom agent response.',
          type: 'ai',
        },
      ]

      render(<AgentLog messages={messages} />)

      // Should convert to "My Custom Agent"
      expect(screen.getByText(/My Custom Agent/i)).toBeTruthy()
    })
  })
})
