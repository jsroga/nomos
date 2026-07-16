import { AlertTriangle, BarChart3, Loader2, Search } from 'lucide-react'
import { Node, Edge } from '@xyflow/react'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { MarketAnalysisReport } from '../../ai/agents/market-analyst/types'
import { CANVAS_NODE_TYPE_GROUP } from '@/domains/loop-creator/constants/graph-state-defaults'
import { MarketAnalysisStreamEvent } from '@/domains/loop-creator/constants/market-analysis'
import {
  MARKET_ANALYSIS_PROGRESS_ICON_DEFAULT,
  MARKET_ANALYSIS_PROGRESS_ICON_TOOL_CALL,
  MARKET_ANALYSIS_PROGRESS_ICON_TOOL_RESULT,
} from '@/domains/loop-creator/ui/constants/market-analysis-score'
import { MarketAnalysisReportView } from './MarketAnalysisReportView'

interface ProgressMessage {
  type: MarketAnalysisStreamEvent
  content: string
  timestamp: number
}

interface MarketAnalysisPanelBodyProps {
  isLoading: boolean
  isAnalyzing: boolean
  report: MarketAnalysisReport | null
  progressMessages: ProgressMessage[]
  error: string | null
  savedAt: Date | null
  hasUnsavedChanges: boolean
  nodes: Node[]
  edges: Edge[]
  gameContext: { gameGenre: string }
  onRunAnalysis: () => void
  onCancelAnalysis: () => void
}

function progressIcon(type: MarketAnalysisStreamEvent): string {
  if (type === MarketAnalysisStreamEvent.ToolCall) return MARKET_ANALYSIS_PROGRESS_ICON_TOOL_CALL
  if (type === MarketAnalysisStreamEvent.ToolResult) return MARKET_ANALYSIS_PROGRESS_ICON_TOOL_RESULT
  return MARKET_ANALYSIS_PROGRESS_ICON_DEFAULT
}

export function MarketAnalysisPanelBody({
  isLoading,
  isAnalyzing,
  report,
  progressMessages,
  error,
  savedAt,
  hasUnsavedChanges,
  nodes,
  edges,
  gameContext,
  onRunAnalysis,
  onCancelAnalysis,
}: MarketAnalysisPanelBodyProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        <span className="ml-2 text-slate-400">Loading saved analysis...</span>
      </div>
    )
  }

  if (!report && !isAnalyzing) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="inline-flex p-4 rounded-full bg-indigo-500/10 border border-indigo-500/30">
          <Search className="w-8 h-8 text-indigo-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">
            {savedAt ? 'No Saved Analysis' : 'Ready to Analyze'}
          </h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Our AI will research market data, analyze competitors, and score your loop against
            reference games like Vampire Survivors, Disco Elysium, and Counter-Strike.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center text-xs text-slate-500">
          <Badge variant="secondary" className="bg-slate-800/50">
            {nodes.filter(node => node.type !== CANVAS_NODE_TYPE_GROUP).length} mechanics
          </Badge>
          <Badge variant="secondary" className="bg-slate-800/50">
            {edges.length} connections
          </Badge>
          <Badge variant="secondary" className="bg-slate-800/50">
            {gameContext.gameGenre || 'Unknown genre'}
          </Badge>
        </div>
        <Button
          className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white"
          onClick={onRunAnalysis}
          disabled={nodes.length === 0}
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Start Analysis
        </Button>
        {nodes.length === 0 && (
          <p className="text-xs text-amber-400">Add some nodes to your canvas first</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {isAnalyzing && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
              <span className="text-sm font-medium text-white">Analyzing market...</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onCancelAnalysis}>
              Cancel
            </Button>
          </div>

          {progressMessages.length > 0 && (
            <div className="space-y-1 p-3 bg-slate-900/50 rounded-lg border border-slate-800 max-h-[200px] overflow-y-auto">
              {progressMessages.slice(-10).map((message, index) => (
                <div key={index} className="text-xs text-slate-400 flex items-start gap-2">
                  <span className="text-indigo-400 shrink-0">{progressIcon(message.type)}</span>
                  <span>{message.content}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-400">Analysis Error</h4>
              <p className="text-xs text-red-300/80 mt-1">{error}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="mt-3 border-red-500/30 text-red-400 hover:bg-red-500/10"
            onClick={onRunAnalysis}
          >
            Retry Analysis
          </Button>
        </div>
      )}

      {report && (
        <MarketAnalysisReportView
          report={report}
          savedAt={savedAt}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      )}
    </div>
  )
}
