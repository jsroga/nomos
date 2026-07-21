'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { useChatStream, getGameEntityProvider } from '@/shared/chat'
import {
  getLoopCreatorMentionProviders,
  buildLoopCreatorProjectContext,
} from '@/domains/loop-creator/core/mentions/providers'
import {
  nodeDescription,
  nodeLabel,
} from '@/domains/loop-creator/core/loop-node-wire'
import {
  parseLoopStreamStateCounts,
  parseLoopStreamThreadId,
} from '@/domains/loop-creator/core/loop-agent-action-wire'
import { NEXT_AGENT_SUPERVISOR } from '@/domains/loop-creator/constants/graph-state-defaults'
import {
  LoopCanvasKind,
  LoopChatMessageType,
  LoopCreatorAgentKey,
  LoopLlmRole,
  LOOP_LOG_ACTION_RECEIVED,
  LOOP_LOG_AUTO_MESSAGE_SUFFIX,
  LOOP_LOG_MARKET_ANALYSIS_OPEN,
  LOOP_LOG_SEND_AUTO_MESSAGE,
  LOOP_LOG_UNKNOWN_ACTION,
  LOOP_CREATOR_WELCOME_MESSAGE,
} from '@/domains/loop-creator/ui/constants/loop-creator-layout'
import { mapLoopAgentActionToEffects } from '@/domains/loop-creator/ui/utils/loop-agent-action-handler'
import type { LoopCreatorCore } from './useLoopCreatorCore'

function createSuggestionId(): string {
  return `suggestion-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export function useLoopChat(projectId: string, core: LoopCreatorCore) {
  const {
    nodes,
    edges,
    analysis,
    gameContext,
    threadId,
    setThreadId,
    setSuggestions,
    setMarketAnalysisKey,
    setIsMarketAnalysisOpen,
    pendingAutoMessage,
    setPendingAutoMessage,
    currentLoopId,
  } = core

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
    groundingScore,
  } = useChatStream({
    projectId,
    initialMessages: [
      {
        sender: NEXT_AGENT_SUPERVISOR,
        content: LOOP_CREATOR_WELCOME_MESSAGE,
        type: LoopChatMessageType.Ai,
      },
    ],
    onStreamingUpdate: data => {
      const stateCounts = parseLoopStreamStateCounts(data)
      if (stateCounts && (stateCounts.mechanics > 0 || stateCounts.loops > 0)) {
        console.log(
          `[LoopCreator] State update: ${stateCounts.mechanics} mechanics, ${stateCounts.loops} loops`,
        )
      }
      const thread = parseLoopStreamThreadId(data)
      if (thread) setThreadId(thread)
    },
    onAction: async action => {
      console.log(LOOP_LOG_ACTION_RECEIVED, action.type, action.payload)
      const effects = mapLoopAgentActionToEffects(action, {
        nodes,
        edges,
        createSuggestionId,
      })
      if (effects.suggestions.length > 0) {
        setSuggestions(prev => [...prev, ...effects.suggestions])
      }
      if (effects.openMarketAnalysis) {
        console.log(LOOP_LOG_MARKET_ANALYSIS_OPEN)
        setMarketAnalysisKey(prev => prev + 1)
        setIsMarketAnalysisOpen(true)
      }
      if (effects.unknownActionType) {
        console.log(LOOP_LOG_UNKNOWN_ACTION, effects.unknownActionType)
      }
    },
  })

  const mentionProviders = useMemo(
    () => [...getLoopCreatorMentionProviders(), getGameEntityProvider()],
    [],
  )

  const projectContextForMentions = useMemo(
    () => {
      const partitionedNodes = nodes.reduce<{
        mechanics: Array<{ id: string; name: string; type?: string; description: string }>
        loops: Array<{ id: string; name: string; type: typeof LoopCanvasKind.Loop; description: string }>
      }>(
        (accumulator, node) => {
          const description = nodeDescription(node)
          const labeledNode = {
            id: node.id,
            name: nodeLabel(node),
            description,
          }

          if (node.type === LoopCanvasKind.Loop) {
            accumulator.loops.push({
              ...labeledNode,
              type: LoopCanvasKind.Loop,
            })
          } else {
            accumulator.mechanics.push({
              ...labeledNode,
              ...(node.type ? { type: node.type } : {}),
            })
          }

          return accumulator
        },
        { mechanics: [], loops: [] },
      )

      return buildLoopCreatorProjectContext({
        projectId,
        mechanics: partitionedNodes.mechanics,
        loops: partitionedNodes.loops,
        connections: edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
        })),
        balanceAnalysis: analysis,
        gameGenre: gameContext.gameGenre,
        gamePlatform: gameContext.gamePlatform,
        targetAudience: gameContext.targetAudience,
      })
    },
    [projectId, nodes, edges, analysis, gameContext],
  )

  const handleSendMessage = useCallback(
    async (msg: string) => {
      if (!msg.trim()) return

      setMessages(prev => [
        ...prev,
        { sender: LoopCreatorAgentKey.User, content: msg, type: LoopChatMessageType.Human },
      ])

      const recentMessages = messages
        .slice(-10)
        .map(m => ({
          role: m.type === LoopChatMessageType.Human ? LoopLlmRole.User : LoopLlmRole.Assistant,
          content: typeof m.content === 'string' ? m.content : '',
        }))
        .filter(m => m.content.length > 0)

      await sendMessage('/api/loop-creator/chat', {
        message: msg,
        projectId,
        threadId,
        recentMessages: recentMessages.length ? recentMessages : undefined,
        context: {
          ...gameContext,
          nodes: nodes.map(n => ({
            id: n.id,
            label: n.data?.label,
            type: n.type,
            data: n.data,
          })),
          edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, label: e.label })),
        },
      })
    },
    [projectId, threadId, sendMessage, setMessages, nodes, edges, gameContext, messages],
  )

  useEffect(() => {
    if (pendingAutoMessage && currentLoopId && !isSending) {
      console.log(
        LOOP_LOG_SEND_AUTO_MESSAGE,
        pendingAutoMessage.slice(0, 50) + LOOP_LOG_AUTO_MESSAGE_SUFFIX,
      )
      handleSendMessage(pendingAutoMessage)
      setPendingAutoMessage(null)
    }
  }, [pendingAutoMessage, currentLoopId, isSending, handleSendMessage, setPendingAutoMessage])

  return {
    messages,
    isSending,
    thinkingAgent,
    stopStream,
    streamingTokens,
    isTokenStreaming,
    activeAgents,
    streamingSections,
    groundingScore,
    mentionProviders,
    projectContextForMentions,
    handleSendMessage,
  }
}

export type LoopChatSlice = ReturnType<typeof useLoopChat>
