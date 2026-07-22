'use client'

import React from 'react'
import { MarketAnalysisPanel } from './MarketAnalysisPanel'
import { LoopCreatorHeader, LoopNodeToolbar } from './LoopCreatorChrome'
import { LoopFlowCanvas } from './LoopFlowCanvas'
import { LoopChatSidebar } from './LoopChatSidebar'
import { useLoopCreatorLayout } from '@/domains/loop-creator/state/hooks/useLoopCreatorLayout'

interface LoopCreatorLayoutProps {
  projectId: string
}

export function LoopCreatorLayout({ projectId }: LoopCreatorLayoutProps) {
  const layout = useLoopCreatorLayout(projectId)

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden font-sans">
      <div className="flex flex-1 overflow-hidden">
        <main className="flex flex-1 flex-col overflow-hidden relative">
          <LoopCreatorHeader
            projectId={projectId}
            currentLoopId={layout.currentLoopId}
            loopMetadata={layout.loopMetadata}
            analysis={layout.analysis}
            nodeCount={layout.nodes.length}
            edgeCount={layout.edges.length}
            groundingScore={null}
            saveStatus={layout.saveStatus}
            showCreateLoopDialog={layout.showCreateLoopDialog}
            loopSelectorTourId={layout.tourIds.LOOP_SELECTOR}
            onLoopChange={layout.handleLoopChange}
            onCreateLoop={layout.handleCreateLoopFromSelector}
            onReset={layout.handleReset}
            onShowCreateLoopDialogChange={layout.setShowCreateLoopDialog}
            onLoopCreatedWithConcept={layout.handleLoopCreatedWithConcept}
            onTidyUp={layout.handleTidyUp}
            onOpenMarketAnalysis={() => layout.setIsMarketAnalysisOpen(true)}
            onImportJson={layout.onImportJson}
          />

          <LoopNodeToolbar onCreateNode={layout.createNode} />

          <LoopFlowCanvas
            nodes={layout.nodes}
            edges={layout.edges}
            onNodesChange={layout.onNodesChange}
            onEdgesChange={layout.onEdgesChange}
            onConnect={layout.onConnect}
            onInit={layout.setRfInstance}
            onNodeClick={layout.handleNodeClick}
            onPaneClick={layout.handlePaneClick}
            selectedNode={layout.selectedNode}
            onNodeUpdate={layout.handleNodeUpdate}
            onNodeDelete={layout.handleNodeDelete}
            onCloseProperties={() => layout.handlePaneClick()}
            suggestions={layout.suggestions}
            onAcceptSuggestion={layout.handleAcceptSuggestion}
            onRejectSuggestion={layout.handleRejectSuggestion}
            onClearAllSuggestions={layout.handleClearAllSuggestions}
            onAcceptAllSuggestions={layout.handleAcceptAllSuggestions}
            currentLoopId={layout.currentLoopId}
            isTourActive={layout.isTourActive}
            onCreateLoopFromEmptyState={layout.handleCreateLoopFromEmptyState}
            canvasTourId={layout.tourIds.LOOP_CANVAS}
            suggestionsTourId={layout.tourIds.LOOP_SUGGESTIONS}
          />
        </main>

        <LoopChatSidebar
          projectId={projectId}
          mentionProviders={layout.mentionProviders}
          projectContext={layout.projectContextForMentions}
          chatTourId={layout.tourIds.LOOP_CHAT}
        />
      </div>

      <MarketAnalysisPanel
        key={`market-analysis-${layout.marketAnalysisKey}`}
        isOpen={layout.isMarketAnalysisOpen}
        onClose={() => layout.setIsMarketAnalysisOpen(false)}
        nodes={layout.nodes}
        edges={layout.edges}
        gameLoopId={layout.currentLoopId}
        gameContext={layout.gameContext}
      />
    </div>
  )
}
