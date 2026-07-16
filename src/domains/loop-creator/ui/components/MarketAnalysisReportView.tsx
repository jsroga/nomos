import {
  AlertTriangle,
  Clock,
  Lightbulb,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/Badge'
import { MarketAnalysisReport } from '../../ai/agents/market-analyst/types'
import { getMarketScoreEmoji, getMarketScoreToneClass } from '../utils/market-analysis-score-utils'

interface MarketAnalysisReportViewProps {
  report: MarketAnalysisReport
  savedAt: Date | null
  hasUnsavedChanges: boolean
}

export function MarketAnalysisReportView({
  report,
  savedAt,
  hasUnsavedChanges,
}: MarketAnalysisReportViewProps) {
  return (
    <div className="space-y-6">
      {savedAt && !hasUnsavedChanges && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Clock className="w-3 h-3" />
          <span>Last saved: {savedAt.toLocaleString()}</span>
        </div>
      )}

      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/30">
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Market Viability</div>
          <div className="text-3xl font-bold text-white">
            {report.overallScore}
            <span className="text-lg text-slate-400">/100</span>
          </div>
        </div>
        <div className={`text-4xl ${getMarketScoreToneClass(report.overallScore)}`}>
          {getMarketScoreEmoji(report.overallScore)}
        </div>
      </div>

      <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Market Size</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-slate-500 mb-1">TAM</div>
            <div className="text-lg font-bold text-white">{report.marketSize.tam}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Target Segment</div>
            <div className="text-lg font-bold text-emerald-400">{report.marketSize.relevantSegment}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Growth</div>
            <div className="text-lg font-bold text-cyan-400">{report.marketSize.growthRate}</div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Audience Fit</h3>
          </div>
          <Badge
            variant={report.audienceFit.fitScore >= 60 ? 'default' : 'secondary'}
            className={
              report.audienceFit.fitScore >= 60
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : ''
            }
          >
            {report.audienceFit.fitScore}/100
          </Badge>
        </div>
        <p className="text-xs text-slate-400 mb-3">{report.audienceFit.targetDemographic}</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-emerald-400 mb-2">Strengths</div>
            <ul className="space-y-1">
              {report.audienceFit.strengths.slice(0, 3).map((strength, index) => (
                <li key={index} className="text-xs text-slate-300 flex items-start gap-1.5">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs text-amber-400 mb-2">Concerns</div>
            <ul className="space-y-1">
              {report.audienceFit.concerns.slice(0, 3).map((concern, index) => (
                <li key={index} className="text-xs text-slate-300 flex items-start gap-1.5">
                  <span className="text-amber-400 mt-0.5">!</span>
                  <span>{concern}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {report.competitors.length > 0 && (
        <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-semibold text-white">
              Competitors ({report.competitors.length})
            </h3>
          </div>
          <div className="space-y-3">
            {report.competitors.slice(0, 4).map((competitor, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg"
              >
                <div>
                  <div className="text-sm font-medium text-white">{competitor.name}</div>
                  <div className="text-xs text-slate-500">{competitor.genre}</div>
                </div>
                <Badge variant="secondary" className="bg-slate-700/50">
                  {competitor.similarityScore}% similar
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-emerald-400">Opportunities</h3>
          </div>
          <ul className="space-y-2">
            {report.opportunities.slice(0, 3).map((opportunity, index) => (
              <li key={index} className="text-xs text-slate-300">
                {opportunity}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4 bg-red-500/5 rounded-xl border border-red-500/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-semibold text-red-400">Risks</h3>
          </div>
          <ul className="space-y-2">
            {report.risks.slice(0, 3).map((risk, index) => (
              <li key={index} className="text-xs text-slate-300">
                {risk}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/20">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-indigo-400">Recommendations</h3>
        </div>
        <ol className="space-y-2">
          {report.recommendations.map((recommendation, index) => (
            <li key={index} className="text-xs text-slate-300 flex items-start gap-2">
              <span className="text-indigo-400 font-bold shrink-0">{index + 1}.</span>
              <span>{recommendation}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
