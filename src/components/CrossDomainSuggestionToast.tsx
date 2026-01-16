/**
 * CrossDomainSuggestionToast Component
 * 
 * Displays cross-domain workflow suggestions as toast notifications.
 * Uses sonner for toast management.
 */

'use client'

import React from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { CrossDomainSuggestion } from '@/lib/cross-domain-suggestions'
import { Gamepad2, BookOpen, Home, Map, Users, Layers, ArrowRight } from 'lucide-react'

const ICON_MAP = {
  Gamepad2,
  BookOpen,
  Home,
  Map,
  Users,
  Layers,
}

interface CrossDomainSuggestionToastProps {
  suggestion: CrossDomainSuggestion
  onAccept?: () => void
  onDismiss?: () => void
}

/**
 * Show a cross-domain suggestion toast
 */
export function showCrossDomainSuggestion(
  suggestion: CrossDomainSuggestion,
  router: ReturnType<typeof useRouter>
) {
  const IconComponent = ICON_MAP[suggestion.icon as keyof typeof ICON_MAP] || Layers

  toast.custom(
    (t) => (
      <div className="bg-gray-900 border border-purple-500/30 rounded-lg p-4 shadow-xl min-w-[320px] max-w-[420px]">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <IconComponent className="w-5 h-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-100 mb-1">
              {suggestion.title}
            </div>
            <div className="text-xs text-gray-400 mb-3">
              {suggestion.description}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  // Navigate to target domain
                  router.push(suggestion.targetRoute)
                  
                  // Store auto-message if available
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
                  
                  toast.dismiss(t)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded text-xs font-medium transition-colors border border-purple-500/30"
              >
                <span>Go to {getDomainLabel(suggestion.targetDomain)}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              
              <button
                onClick={() => toast.dismiss(t)}
                className="px-3 py-1.5 text-gray-400 hover:text-gray-300 rounded text-xs transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      duration: 10000,
      position: 'bottom-right',
    }
  )
}

/**
 * Get domain label for display
 */
function getDomainLabel(domain: string): string {
  const labels: Record<string, string> = {
    storyteller: 'Storyteller',
    'loop-creator': 'Loop Creator',
    'interior-designer': 'Interior Designer',
    'world-building': 'World Builder',
  }
  return labels[domain] || domain
}

export default showCrossDomainSuggestion
