/**
 * useCrossDomainSuggestions Hook
 *
 * React hook for managing cross-domain workflow suggestions.
 * Shows toast notifications and handles navigation.
 */

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CrossDomainSuggestion, SuggestionEngine } from '@/lib/cross-domain-suggestions'
import { GameEntity } from './useGameEntities'
import { Gamepad2, BookOpen, Home, Map, Users, Layers } from 'lucide-react'

const ICON_MAP = {
  Gamepad2,
  BookOpen,
  Home,
  Map,
  Users,
  Layers,
}

/**
 * Hook for managing cross-domain suggestions
 */
export function useCrossDomainSuggestions(projectId: string) {
  const router = useRouter()

  /**
   * Show suggestion toast after entity creation
   */
  const showSuggestionToast = useCallback(
    (suggestion: CrossDomainSuggestion) => {
      const IconComponent = ICON_MAP[suggestion.icon as keyof typeof ICON_MAP] || Layers

      toast(suggestion.title, {
        description: suggestion.description,
        icon: <IconComponent className="w-4 h-4" />,
        duration: 10000, // 10 seconds
        action: {
          label: 'Go',
          onClick: () => {
            // Navigate to target domain
            router.push(suggestion.targetRoute)

            // If there's an auto-message, store it for the target page to pick up
            if (suggestion.autoMessage) {
              sessionStorage.setItem(
                'crossDomainAutoMessage',
                JSON.stringify({
                  message: suggestion.autoMessage,
                  entityId: suggestion.entityId,
                  timestamp: Date.now(),
                })
              )
            }
          },
        },
      })
    },
    [router]
  )

  /**
   * Show suggestions for a newly created entity
   */
  const showSuggestionsForEntity = useCallback(
    (entity: GameEntity) => {
      const suggestions = SuggestionEngine.getSuggestionsForEntity(entity, projectId)

      // Show top 2 suggestions
      suggestions.slice(0, 2).forEach((suggestion, index) => {
        // Stagger the toasts slightly
        setTimeout(() => {
          showSuggestionToast(suggestion)
        }, index * 200)
      })
    },
    [projectId, showSuggestionToast]
  )

  /**
   * Check for and execute auto-message from cross-domain navigation
   */
  const checkForAutoMessage = useCallback(() => {
    if (typeof window === 'undefined') return null

    const stored = sessionStorage.getItem('crossDomainAutoMessage')
    if (!stored) return null

    try {
      const data = JSON.parse(stored)

      // Check if message is recent (within last 10 seconds)
      if (Date.now() - data.timestamp > 10000) {
        sessionStorage.removeItem('crossDomainAutoMessage')
        return null
      }

      // Clear the message so it's only used once
      sessionStorage.removeItem('crossDomainAutoMessage')

      return data
    } catch (error) {
      console.error('[useCrossDomainSuggestions] Error parsing auto-message:', error)
      return null
    }
  }, [])

  return {
    showSuggestionToast,
    showSuggestionsForEntity,
    checkForAutoMessage,
  }
}
