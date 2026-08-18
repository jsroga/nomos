'use client'

import { useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { ContentType, HttpMethod, QueryParam } from '@/shared/data/constants/protocol'
import { buildUrl } from '@/shared/data/url-builder'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import { storytellerKeys } from '@/domains/storyteller/core/io/storyteller.keys'
import { splitFixInconsistenciesSseChunks } from '@/domains/storyteller/core/io/fix-inconsistencies-sse'
import { applyFixInconsistenciesSseFrame } from './apply-fix-inconsistencies-sse-frame'
import {
  ConsistencyFixItemSchema,
  ContinuityFindingSchema,
} from '@/domains/storyteller/ai/workflows/fix-inconsistencies-schema'
import { SkippedFindingSchema } from '@/domains/storyteller/ai/workflows/fix-inconsistencies-contract'
import {
  FixInconsistenciesApiPath,
  FixInconsistenciesRunStatus,
  FixInconsistenciesVerdictAction,
} from '@/domains/storyteller/ai/workflows/constants/fix-inconsistencies-workflow'
import {
  ConsistencyFixRunPhase,
  FixInconsistenciesToastCopy,
  consistencyFixRunStorageKey,
} from '@/domains/storyteller/ui/FixInconsistencies/constants/fix-inconsistencies-dialog'
import { isGenerationActivityBusy } from '@/domains/storyteller/state/constants/storyteller-ui-store'
import {
  IDLE_CONSISTENCY_FIX_RUN,
  useStorytellerUiStore,
} from '@/domains/storyteller/state/useStorytellerUiStore'
import { z } from 'zod'

const FindingsSchema = z.array(ContinuityFindingSchema)
const FixesSchema = z.array(ConsistencyFixItemSchema)
const SkippedSchema = z.array(SkippedFindingSchema)

interface UseFixInconsistenciesRunInput {
  projectId: string | null
  hasPendingBible: boolean
}

export function useFixInconsistenciesRun({
  projectId,
  hasPendingBible,
}: UseFixInconsistenciesRunInput) {
  const queryClient = useQueryClient()
  const abortRef = useRef<AbortController | null>(null)
  const restoredRef = useRef(false)
  const run = useStorytellerUiStore(state => state.consistencyFixRun)
  const setRun = useStorytellerUiStore(state => state.setConsistencyFixRun)
  const resetRun = useStorytellerUiStore(state => state.resetConsistencyFixRun)
  const generationPhase = useStorytellerUiStore(state => state.generationActivity.phase)

  const persistRunId = useCallback((id: string | null) => {
    if (!projectId) return
    const key = consistencyFixRunStorageKey(projectId)
    if (id) sessionStorage.setItem(key, id)
    else sessionStorage.removeItem(key)
  }, [projectId])

  const clear = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    if (projectId) persistRunId(null)
    resetRun()
  }, [persistRunId, projectId, resetRun])

  const applyReviewPayload = useCallback((payload: Record<string, unknown>, runId: string) => {
    const findings = FindingsSchema.safeParse(payload.findings)
    const fixes = FixesSchema.safeParse(payload.fixes)
    const skipped = SkippedSchema.safeParse(payload.skipped)
    persistRunId(runId)
    setRun({
      phase: ConsistencyFixRunPhase.Review,
      projectId,
      runId,
      findings: findings.success ? findings.data : [],
      fixes: fixes.success ? fixes.data : [],
      skipped: skipped.success ? skipped.data : [],
      empty: payload.empty === true,
      message: readString(payload.reason) ?? readString(payload.message) ?? '',
      error: null,
    })
  }, [persistRunId, projectId, setRun])

  const applyComplete = useCallback((payload: Record<string, unknown>) => {
    persistRunId(null)
    const findings = FindingsSchema.safeParse(payload.findings)
    const fixes = FixesSchema.safeParse(payload.fixes)
    const skipped = SkippedSchema.safeParse(payload.skipped)
    setRun({
      phase: ConsistencyFixRunPhase.Done,
      findings: findings.success ? findings.data : [],
      fixes: fixes.success ? fixes.data : [],
      skipped: skipped.success ? skipped.data : [],
      empty: payload.empty === true,
      appliedCount: typeof payload.appliedCount === 'number' ? payload.appliedCount : 0,
      message: readString(payload.message) ?? '',
      error: null,
    })
    void queryClient.invalidateQueries({ queryKey: storytellerKeys.all })
  }, [persistRunId, queryClient, setRun])

  const start = useCallback(async () => {
    if (!projectId) return
    if (isGenerationActivityBusy(generationPhase)) {
      toast.error(FixInconsistenciesToastCopy.ChatBusy)
      return
    }
    if (run.phase !== ConsistencyFixRunPhase.Idle) {
      toast.error(FixInconsistenciesToastCopy.AlreadyRunning)
      return
    }
    if (hasPendingBible) {
      toast.error(FixInconsistenciesToastCopy.PendingBible)
      return
    }

    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort
    setRun({
      ...IDLE_CONSISTENCY_FIX_RUN,
      phase: ConsistencyFixRunPhase.Scanning,
      projectId,
    })

    try {
      const response = await fetch(FixInconsistenciesApiPath.Run, {
        method: HttpMethod.Post,
        headers: { 'Content-Type': ContentType.Json },
        body: JSON.stringify({ projectId }),
        signal: abort.signal,
      })
      if (!response.ok || !response.body) {
        toast.error(FixInconsistenciesToastCopy.StartFailed)
        resetRun()
        return
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        buffer += decoder.decode(chunk.value, { stream: true })
        const split = splitFixInconsistenciesSseChunks(buffer)
        buffer = split.rest
        for (const frame of split.frames) {
          applyFixInconsistenciesSseFrame(frame, {
            onStarted: runId => setRun({ runId }),
            onStep: stepId => setRun({ stepId }),
            onSuspended: applyReviewPayload,
            onComplete: applyComplete,
            onError: message => {
              persistRunId(null)
              setRun({
                phase: ConsistencyFixRunPhase.Error,
                error: message ?? FixInconsistenciesToastCopy.StartFailed,
              })
            },
          })
        }
      }
    } catch (error) {
      if (abort.signal.aborted) {
        resetRun()
        return
      }
      persistRunId(null)
      setRun({
        phase: ConsistencyFixRunPhase.Error,
        error: error instanceof Error ? error.message : FixInconsistenciesToastCopy.StartFailed,
      })
    }
  }, [
    applyComplete,
    applyReviewPayload,
    generationPhase,
    hasPendingBible,
    persistRunId,
    projectId,
    resetRun,
    run.phase,
    setRun,
  ])

  const resume = useCallback(async (action: FixInconsistenciesVerdictAction) => {
    if (!projectId || !run.runId) return
    setRun({ phase: ConsistencyFixRunPhase.Applying })
    const response = await fetch(FixInconsistenciesApiPath.Resume, {
      method: HttpMethod.Post,
      headers: { 'Content-Type': ContentType.Json },
      body: JSON.stringify({ runId: run.runId, action, projectId }),
    })
    const body = recordFromJson(await response.json().catch(() => ({})))
    if (!response.ok) {
      toast.error(FixInconsistenciesToastCopy.ApplyFailed)
      setRun({ phase: ConsistencyFixRunPhase.Review })
      return
    }
    applyComplete(recordFromJson(body.output))
  }, [applyComplete, projectId, run.runId, setRun])

  const applyAll = useCallback(() => resume(FixInconsistenciesVerdictAction.Apply), [resume])
  const discardAll = useCallback(() => resume(FixInconsistenciesVerdictAction.Discard), [resume])

  const cancelScan = useCallback(() => {
    abortRef.current?.abort()
    persistRunId(null)
    resetRun()
  }, [persistRunId, resetRun])

  useEffect(() => {
    if (!projectId || restoredRef.current) return
    restoredRef.current = true
    const stored = sessionStorage.getItem(consistencyFixRunStorageKey(projectId))
    if (!stored) return
    void (async () => {
      const response = await fetch(
        buildUrl(FixInconsistenciesApiPath.Resume, { [QueryParam.RunId]: stored })
      )
      if (!response.ok) {
        persistRunId(null)
        return
      }
      const body = recordFromJson(await response.json())
      if (readString(body.status) !== FixInconsistenciesRunStatus.Suspended) {
        persistRunId(null)
        return
      }
      applyReviewPayload(recordFromJson(body.suspendPayload), stored)
    })()
  }, [applyReviewPayload, persistRunId, projectId])

  return {
    run,
    start,
    applyAll,
    discardAll,
    cancelScan,
    clear,
  }
}
