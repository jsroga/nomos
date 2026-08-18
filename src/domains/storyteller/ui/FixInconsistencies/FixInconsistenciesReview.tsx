'use client'

import { AlertTriangle, Check } from 'lucide-react'
import { ScrollArea } from '@/components/ScrollArea'
import { cn } from '@/shared/data/utils'
import { JSONDiffViewer } from '@/domains/storyteller/ui/JSONDiffViewer'
import { CONSISTENCY_DEFAULT_SEVERITY_CLASS, CONSISTENCY_SEVERITY_TEXT_CLASS } from '@/domains/storyteller/ui/ConsistencyMessage/constants/consistency-message-display'
import type { ConsistencyFixItem, ContinuityFinding } from '@/domains/storyteller/ai/workflows/fix-inconsistencies-schema'
import type { SkippedFinding } from '@/domains/storyteller/ai/workflows/fix-inconsistencies-contract'
import { FixInconsistenciesSkipReason } from '@/domains/storyteller/ai/workflows/constants/fix-inconsistencies-workflow'
import {
  FixInconsistenciesDialogClass,
  FixInconsistenciesDialogCopy,
} from './constants/fix-inconsistencies-dialog'

interface FixInconsistenciesReviewProps {
  findings: ContinuityFinding[]
  fixes: ConsistencyFixItem[]
  skipped: SkippedFinding[]
}

function fixForFinding(
  finding: ContinuityFinding,
  fixes: ConsistencyFixItem[]
): ConsistencyFixItem | undefined {
  return fixes.find(item => item.inconsistencyId === finding.id)
}

export function FixInconsistenciesReview({
  findings,
  fixes,
  skipped,
}: FixInconsistenciesReviewProps) {
  const unpatchable: SkippedFinding[] = []
  const otherSkipped: SkippedFinding[] = []
  for (const item of skipped) {
    if (item.reason === FixInconsistenciesSkipReason.Unpatchable) unpatchable.push(item)
    else otherSkipped.push(item)
  }

  return (
    <ScrollArea className={FixInconsistenciesDialogClass.List}>
      <div className="space-y-3 pr-2">
        {findings.map(finding => {
          const fix = fixForFinding(finding, fixes)
          return (
            <div key={finding.id} className="border border-border/30 rounded-lg overflow-hidden bg-background">
              <div className="flex items-start gap-3 p-3">
                <div
                  className={cn(
                    'p-1.5 rounded bg-muted/50 flex-shrink-0',
                    CONSISTENCY_SEVERITY_TEXT_CLASS[finding.severity] ?? CONSISTENCY_DEFAULT_SEVERITY_CLASS
                  )}
                >
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground">
                    {finding.type} · {finding.severity}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{finding.quote}</div>
                  <div className="text-[11px] text-foreground/80 mt-1">{finding.why}</div>
                </div>
                {fix ? <Check className="w-4 h-4 text-green-500 flex-shrink-0" /> : null}
              </div>
              {fix ? (
                <div className="border-t border-border/30 p-3 bg-muted/10">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">
                    {FixInconsistenciesDialogCopy.ProposedPatch}
                  </div>
                  <JSONDiffViewer changes={fix.changes} />
                </div>
              ) : null}
            </div>
          )
        })}

        {unpatchable.length > 0 ? (
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              {FixInconsistenciesDialogCopy.Unpatchable}
            </div>
            {unpatchable.map(item => (
              <div key={`${item.findingId}-${item.reason}`} className={FixInconsistenciesDialogClass.SkipRow}>
                {item.detail}
              </div>
            ))}
          </div>
        ) : null}

        {otherSkipped.length > 0 ? (
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              {FixInconsistenciesDialogCopy.Skipped}
            </div>
            {otherSkipped.map(item => (
              <div key={`${item.findingId}-${item.reason}`} className={FixInconsistenciesDialogClass.SkipRow}>
                {item.detail}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </ScrollArea>
  )
}
