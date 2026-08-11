/**
 * Market Analysis Panel
 *
 * Displays market analysis results with save/regenerate capability.
 */

'use client'

import { X, TrendingUp, Loader2, Save, RefreshCw, Check } from 'lucide-react'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { ScrollArea } from '@/components/ScrollArea'
import { Node, Edge } from '@xyflow/react'
import { useMarketAnalysisPanel } from '@/domains/loop-creator/state/hooks/useMarketAnalysisPanel'
import { MarketAnalysisPanelBody } from './MarketAnalysisPanelBody'

interface MarketAnalysisPanelProps {
  isOpen: boolean
  onClose: () => void
  nodes: Node[]
  edges: Edge[]
  gameLoopId: string | null
  gameContext: {
    gameGenre: string
    gamePlatform: string
    targetAudience: string
    gameDescription: string
  }
}

export function MarketAnalysisPanel({
  isOpen,
  onClose,
  nodes,
  edges,
  gameLoopId,
  gameContext,
}: MarketAnalysisPanelProps) {
  const {
    isAnalyzing,
    isLoading,
    isSaving,
    report,
    progressMessages,
    error,
    savedAt,
    hasUnsavedChanges,
    runAnalysis,
    saveAnalysis,
    regenerateAnalysis,
    cancelAnalysis,
  } = useMarketAnalysisPanel({ isOpen, nodes, edges, gameLoopId, gameContext })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-[#0d0d14] border border-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Market Analysis</h2>
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-400">AI-powered research on your game loop</p>
                {savedAt && !hasUnsavedChanges && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  >
                    <Check className="w-2.5 h-2.5 mr-1" />
                    Saved
                  </Badge>
                )}
                {hasUnsavedChanges && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30"
                  >
                    Unsaved
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {report && gameLoopId && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-slate-700 text-slate-400 hover:text-white"
                  onClick={regenerateAnalysis}
                  disabled={isAnalyzing}
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 mr-1.5 ${isAnalyzing ? 'animate-spin' : ''}`}
                  />
                  Regenerate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                  onClick={saveAnalysis}
                  disabled={isSaving || !hasUnsavedChanges}
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Save
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            <MarketAnalysisPanelBody
              isLoading={isLoading}
              isAnalyzing={isAnalyzing}
              report={report}
              progressMessages={progressMessages}
              error={error}
              savedAt={savedAt}
              hasUnsavedChanges={hasUnsavedChanges}
              nodes={nodes}
              edges={edges}
              gameContext={gameContext}
              onRunAnalysis={runAnalysis}
              onCancelAnalysis={cancelAnalysis}
            />
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
