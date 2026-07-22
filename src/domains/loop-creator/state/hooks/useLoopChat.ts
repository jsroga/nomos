'use client'

import { useMemo } from 'react'
import { getGameEntityProvider } from '@/shared/chat/core/mentions/game-entity-provider'
import {
  getLoopCreatorMentionProviders,
  buildLoopCreatorProjectContext,
} from '@/domains/loop-creator/core/mentions/providers'
import { nodeDescription, nodeLabel } from '@/domains/loop-creator/core/loop-node-wire'
import { LoopCanvasKind } from '@/domains/loop-creator/ui/constants/loop-creator-layout'
import type { LoopCreatorCore } from './useLoopCreatorCore'

/**
 * Loop-creator `@`-mention data for the assistant-ui chat sidebar. The chat
 * itself now streams through `/api/loop-creator/assistant` (the Mastra crew), so
 * this hook only derives the mention providers + project context from the canvas
 * state — the old `useChatStream` / streaming-sections wiring is gone.
 */
export function useLoopChat(projectId: string, core: LoopCreatorCore) {
  const { nodes, edges, analysis, gameContext } = core

  const mentionProviders = useMemo(
    () => [...getLoopCreatorMentionProviders(), getGameEntityProvider()],
    [],
  )

  const projectContextForMentions = useMemo(() => {
    const partitionedNodes = nodes.reduce<{
      mechanics: Array<{ id: string; name: string; type?: string; description: string }>
      loops: Array<{ id: string; name: string; type: typeof LoopCanvasKind.Loop; description: string }>
    }>(
      (accumulator, node) => {
        const description = nodeDescription(node)
        const labeledNode = { id: node.id, name: nodeLabel(node), description }

        if (node.type === LoopCanvasKind.Loop) {
          accumulator.loops.push({ ...labeledNode, type: LoopCanvasKind.Loop })
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
      connections: edges.map(e => ({ id: e.id, source: e.source, target: e.target })),
      balanceAnalysis: analysis,
      gameGenre: gameContext.gameGenre,
      gamePlatform: gameContext.gamePlatform,
      targetAudience: gameContext.targetAudience,
    })
  }, [projectId, nodes, edges, analysis, gameContext])

  return { mentionProviders, projectContextForMentions }
}

export type LoopChatSlice = ReturnType<typeof useLoopChat>
