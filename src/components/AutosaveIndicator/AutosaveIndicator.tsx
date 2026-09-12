'use client'

import { Globe } from 'lucide-react'
import { cn } from '@/shared/data/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/Tooltip'
import {
  AutosaveCopy,
  AutosaveStatus,
} from '@/shared/workspace/constants/autosave'
import {
  selectAutosaveIndicatorStatus,
  useAutosaveStatusStore,
} from '@/shared/workspace/autosave-status-store'

const GLOBE_SIZE = 18

function copyForStatus(status: AutosaveStatus): AutosaveCopy | null {
  if (status === AutosaveStatus.Saving) return AutosaveCopy.Saving
  if (status === AutosaveStatus.Saved) return AutosaveCopy.Saved
  if (status === AutosaveStatus.Error) return AutosaveCopy.Failed
  return null
}

export function AutosaveIndicator() {
  const status = useAutosaveStatusStore(state => selectAutosaveIndicatorStatus(state.entries))
  const copy = copyForStatus(status)
  if (!copy) return null

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="status"
            aria-live="polite"
            aria-label={copy}
            className="inline-flex h-9 w-9 items-center justify-center"
          >
            <Globe
              size={GLOBE_SIZE}
              className={cn(
                status === AutosaveStatus.Saving && 'animate-spin text-white/70',
                status === AutosaveStatus.Saved && 'text-emerald-400',
                status === AutosaveStatus.Error && 'text-red-500',
              )}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="z-[200]">
          <span className="text-sm">{copy}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
