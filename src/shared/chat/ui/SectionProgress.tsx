/**
 * Section Progress Component
 *
 * Displays visual progress for multi-step AI operations.
 * Shows current section, completion status, and estimated time.
 */

import React, { useState, useMemo } from 'react'
import { cn } from '@/shared/data/utils'
import { Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SectionProgressStatus } from '@/shared/chat/ui/constants/section-progress'
import {
  sectionIndicatorClass,
  sectionLabelClass,
  SectionStatusIcon,
  subSectionLabelClass,
  SubSectionStatusIcon,
} from '@/shared/chat/ui/SectionProgressIndicators'

export interface ProgressSection {
  id: string
  label: string
  status: SectionProgressStatus
  startTime?: number
  endTime?: number
  details?: string
  subSections?: ProgressSection[]
}

interface SectionProgressProps {
  sections: ProgressSection[]
  title?: string
  showEstimatedTime?: boolean
  collapsible?: boolean
  defaultExpanded?: boolean
  className?: string
}

/**
 * Format duration in human readable format
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

/**
 * Calculate estimated remaining time based on completed sections
 */
function calculateEstimatedTime(sections: ProgressSection[]): number | null {
  const completed: ProgressSection[] = []
  const pending: ProgressSection[] = []
  const inProgress: ProgressSection[] = []
  for (const s of sections) {
    if (s.status === SectionProgressStatus.Completed && s.startTime && s.endTime) completed.push(s)
    else if (s.status === SectionProgressStatus.Pending) pending.push(s)
    else if (s.status === SectionProgressStatus.InProgress) inProgress.push(s)
  }

  if (completed.length === 0 || (pending.length === 0 && inProgress.length === 0)) {
    return null
  }

  // Average time per completed section
  const totalCompletedTime = completed.reduce((sum, s) => sum + ((s.endTime ?? 0) - (s.startTime ?? 0)), 0)
  const avgTimePerSection = totalCompletedTime / completed.length

  // Estimated remaining = avg time * (pending + 0.5 * in_progress)
  return avgTimePerSection * (pending.length + 0.5 * inProgress.length)
}

/**
 * Single section item component
 */
const SectionItem: React.FC<{
  section: ProgressSection
  index: number
  isLast: boolean
}> = ({ section, index, isLast }) => {
  const duration =
    section.startTime && section.endTime
      ? formatDuration(section.endTime - section.startTime)
      : null

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative"
    >
      {/* Connector line */}
      {!isLast && (
        <div
          className={cn(
            'absolute left-[11px] top-[22px] w-[2px] h-[calc(100%+4px)]',
            section.status === SectionProgressStatus.Completed ? 'bg-emerald-500/50' : 'bg-border'
          )}
        />
      )}

      <div className="flex items-start gap-3 py-1">
        {/* Status indicator */}
        <div className={sectionIndicatorClass(section.status)}>
          <SectionStatusIcon status={section.status} index={index} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={sectionLabelClass(section.status)}>{section.label}</span>

            {duration && <span className="text-xs text-muted-foreground">{duration}</span>}
          </div>

          {section.details && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{section.details}</p>
          )}

          {/* Sub-sections */}
          {section.subSections && section.subSections.length > 0 && (
            <div className="ml-2 mt-2 space-y-1 border-l-2 border-border/50 pl-3">
              {section.subSections.map((sub, _i) => (
                <div key={sub.id} className="flex items-center gap-2 text-xs">
                  <SubSectionStatusIcon status={sub.status} />
                  <span className={subSectionLabelClass(sub.status)}>{sub.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Main SectionProgress component
 */
export const SectionProgress: React.FC<SectionProgressProps> = ({
  sections,
  title,
  showEstimatedTime = true,
  collapsible = false,
  defaultExpanded = true,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const estimatedTime = useMemo(() => {
    if (!showEstimatedTime) return null
    return calculateEstimatedTime(sections)
  }, [sections, showEstimatedTime])

  const completed = sections.filter(s => s.status === SectionProgressStatus.Completed).length
  const total = sections.length
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  const hasInProgress = sections.some(s => s.status === SectionProgressStatus.InProgress)

  return (
    <div
      className={cn(
        'rounded-lg border bg-card/50 overflow-hidden',
        hasInProgress && 'border-blue-500/30',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 bg-muted/30',
          collapsible && 'cursor-pointer hover:bg-muted/50 transition-colors'
        )}
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {title && <h4 className="text-sm font-medium">{title}</h4>}

          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-emerald-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {completed}/{total}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Estimated time */}
          {showEstimatedTime && estimatedTime !== null && hasInProgress && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>~{formatDuration(estimatedTime)} left</span>
            </div>
          )}

          {/* Collapse toggle */}
          {collapsible && (
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Sections list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 py-3"
          >
            <div className="space-y-1">
              {sections.map((section, index) => (
                <SectionItem
                  key={section.id}
                  section={section}
                  index={index}
                  isLast={index === sections.length - 1}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}