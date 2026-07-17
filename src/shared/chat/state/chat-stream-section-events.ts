import { ChatFrameType } from '../core/protocol'
import { asString } from './chat-stream-payload-helpers'
import { SectionProgressStatus } from '../ui/constants/section-progress'
import type { ProgressSection } from '../ui/SectionProgress'
import type { MutableRefObject, Dispatch, SetStateAction } from 'react'

function frameType(data: Record<string, unknown>): string | undefined {
  return asString(data.type)
}

export function processSectionEventData(
  verboseUiRef: MutableRefObject<boolean>,
  setStreamingSections: Dispatch<SetStateAction<ProgressSection[]>>,
  data: Record<string, unknown>
): void {
  if (!verboseUiRef.current) return
  const type = frameType(data)
  if (type === ChatFrameType.SectionStart) {
    setStreamingSections(prev => {
      const existing = prev.find(s => s.id === data.section)
      if (existing) {
        return prev.map(s =>
          s.id === data.section
            ? { ...s, status: SectionProgressStatus.InProgress, startTime: Date.now() }
            : s
        )
      }
      return [
        ...prev,
        {
          id: String(data.section),
          label: String(data.label || data.section),
          status: SectionProgressStatus.InProgress,
          startTime: Date.now(),
        },
      ]
    })
  } else if (type === ChatFrameType.SectionComplete) {
    setStreamingSections(prev =>
      prev.map(s =>
        s.id === data.section
          ? {
              ...s,
              status: SectionProgressStatus.Completed,
              endTime: Date.now(),
              details: asString(data.preview) || asString(data.details),
            }
          : s
      )
    )
  } else if (type === ChatFrameType.SectionError) {
    setStreamingSections(prev =>
      prev.map(s =>
        s.id === data.section
          ? {
              ...s,
              status: SectionProgressStatus.Error,
              endTime: Date.now(),
              details: asString(data.error),
            }
          : s
      )
    )
  }
}
