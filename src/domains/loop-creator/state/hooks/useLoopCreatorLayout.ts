'use client'

import { useLoopCreatorCore } from './useLoopCreatorCore'
import { useLoopCreatorTour } from './useLoopCreatorTour'
import { useLoopPersistence } from './useLoopPersistence'
import { useLoopCreatorGraph } from './useLoopCreatorGraph'
import { useLoopChat } from './useLoopChat'

export function useLoopCreatorLayout(projectId: string) {
  const core = useLoopCreatorCore()
  const tour = useLoopCreatorTour()
  const persistence = useLoopPersistence(projectId, core)
  const graph = useLoopCreatorGraph({ core, createNewLoop: persistence.createNewLoop })
  const chat = useLoopChat(projectId, core)

  return {
    isTourActive: tour.isTourActive,
    nodes: core.nodes,
    edges: core.edges,
    onNodesChange: core.onNodesChange,
    onEdgesChange: core.onEdgesChange,
    loopMetadata: core.loopMetadata,
    analysis: core.analysis,
    currentLoopId: core.currentLoopId,
    gameContext: core.gameContext,
    suggestions: core.suggestions,
    selectedNode: core.selectedNode,
    isMarketAnalysisOpen: core.isMarketAnalysisOpen,
    marketAnalysisKey: core.marketAnalysisKey,
    showCreateLoopDialog: core.showCreateLoopDialog,
    userEmail: core.userEmail,
    saveStatus: persistence.saveStatus,
    mentionProviders: chat.mentionProviders,
    projectContextForMentions: chat.projectContextForMentions,
    tourIds: tour.tourIds,
    setShowCreateLoopDialog: core.setShowCreateLoopDialog,
    setIsMarketAnalysisOpen: core.setIsMarketAnalysisOpen,
    setIsActivityPanelOpen: core.setIsActivityPanelOpen,
    setRfInstance: core.setRfInstance,
    handleLoopChange: persistence.handleLoopChange,
    handleReset: persistence.handleReset,
    handleCreateLoopFromSelector: persistence.handleCreateLoopFromSelector,
    handleCreateLoopFromEmptyState: persistence.handleCreateLoopFromEmptyState,
    handleLoopCreatedWithConcept: persistence.handleLoopCreatedWithConcept,
    handleAcceptSuggestion: graph.handleAcceptSuggestion,
    handleRejectSuggestion: graph.handleRejectSuggestion,
    handleClearAllSuggestions: graph.handleClearAllSuggestions,
    handleAcceptAllSuggestions: graph.handleAcceptAllSuggestions,
    handleNodeClick: graph.handleNodeClick,
    handlePaneClick: graph.handlePaneClick,
    handleNodeUpdate: graph.handleNodeUpdate,
    handleNodeDelete: graph.handleNodeDelete,
    createNode: graph.createNode,
    onImportJson: graph.onImportJson,
    onConnect: graph.onConnect,
    handleTidyUp: graph.handleTidyUp,
  }
}

export type LoopCreatorLayoutState = ReturnType<typeof useLoopCreatorLayout>
