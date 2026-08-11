'use client'

import { Sparkles } from 'lucide-react'
import { Button } from '@/components/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/Dialog'
import { ScrollArea } from '@/components/ScrollArea'
import { LoopAnalysisWireField } from '@/domains/loop-creator/constants/loop-analysis-wire'
import {
  readAnalysisCoreInsight,
  readAnalysisPillarScores,
  readAnalysisStringList,
  readLoopMetadataName,
} from '../types/loop-layout-wires'

interface LoopAnalysisDialogProps {
  analysis: unknown
  loopMetadata: unknown
}

export function LoopAnalysisDialog({ analysis, loopMetadata }: LoopAnalysisDialogProps) {
  const coreInsight = readAnalysisCoreInsight(analysis)
  const pillarScores = readAnalysisPillarScores(analysis)
  const keyInnovations = readAnalysisStringList(analysis, LoopAnalysisWireField.KeyInnovations)
  const designLessons = readAnalysisStringList(analysis, LoopAnalysisWireField.DesignLessons)
  const loopStrengths = readAnalysisStringList(analysis, LoopAnalysisWireField.LoopStrengths)
  const loopName = readLoopMetadataName(loopMetadata)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 h-8">
          <Sparkles className="w-4 h-4" />
          Analysis
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-[#0d0d14] border-slate-800 text-slate-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Loop Analysis: {loopName}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6 py-4">
            {coreInsight && (
              <div className="p-4 rounded-lg bg-cyan-950/20 border border-cyan-500/30">
                <p className="text-cyan-400 italic font-medium text-sm leading-relaxed">
                  &quot;{coreInsight}&quot;
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest text-slate-500">
                  Five Pillars
                </h3>
                <div className="space-y-4">
                  {Object.entries(pillarScores).map(([pillar, score]) => (
                    <div key={pillar} className="space-y-2">
                      <div className="flex justify-between text-[10px] uppercase font-bold tracking-tight text-slate-400">
                        <span>{pillar}</span>
                        <span className="text-cyan-400">{score}/10</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/30">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-1000"
                          style={{ width: `${score * 10}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest text-slate-500">
                  Key Innovations
                </h3>
                <ul className="space-y-3">
                  {keyInnovations.map((item, index) => (
                    <li key={item} className="text-xs text-slate-300 flex gap-3 leading-relaxed">
                      <span className="text-cyan-500 font-bold">0{index + 1}.</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-800/50">
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest text-slate-500">
                  Design Lessons
                </h3>
                <ul className="space-y-2">
                  {designLessons.map(item => (
                    <li key={item} className="text-xs text-slate-300 flex gap-2 items-start">
                      <span className="text-emerald-500 mt-0.5">💡</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest text-slate-500">
                  Loop Strengths
                </h3>
                <ul className="space-y-2">
                  {loopStrengths.map(item => (
                    <li key={item} className="text-xs text-slate-300 flex gap-2 items-start">
                      <span className="text-blue-500 mt-0.5">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
