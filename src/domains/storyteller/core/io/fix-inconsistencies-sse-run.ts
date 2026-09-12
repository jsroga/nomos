import '@/shared/data/server-guard'
import { withGatewayContext } from '@/shared/ai/gateway/call-context'
import { withMastraSpan } from '@/shared/observability/mastra-tracing'
import type { ProjectScope } from '@/shared/auth/project-scope'
import { FIX_INCONSISTENCIES_WORKFLOW_ID } from '@/domains/storyteller/ai/workflows/fix-inconsistencies-contract'
import {
  FixInconsistenciesRunStatus,
  FixInconsistenciesSseEvent,
} from '@/domains/storyteller/ai/workflows/constants/fix-inconsistencies-workflow'
import {
  createFixInconsistenciesWorkflowRun,
  executeFixInconsistenciesStart,
  type FixInconsistenciesStartResult,
} from './fix-inconsistencies-run'

export interface FixInconsistenciesSseSink {
  send: (event: FixInconsistenciesSseEvent, data: unknown) => void
  flush: () => Promise<void>
}

function emitFixInconsistenciesStartResult(
  send: FixInconsistenciesSseSink['send'],
  result: FixInconsistenciesStartResult,
  projectId: string
): void {
  if (!result.ok) {
    send(FixInconsistenciesSseEvent.Error, { runId: result.runId, message: result.error })
    return
  }
  if (result.status === FixInconsistenciesRunStatus.Suspended) {
    send(FixInconsistenciesSseEvent.Suspended, {
      runId: result.runId,
      projectId,
      ...result.payload,
    })
    return
  }
  send(FixInconsistenciesSseEvent.Complete, {
    runId: result.runId,
    projectId,
    ...result.output,
  })
}

export async function pipeFixInconsistenciesStartToSse(input: {
  projectId: string
  scope: ProjectScope
  traceId: string
  sink: FixInconsistenciesSseSink
}): Promise<void> {
  const { projectId, scope, traceId, sink } = input
  await withGatewayContext({ scope, traceId }, () =>
    withMastraSpan(traceId, FIX_INCONSISTENCIES_WORKFLOW_ID, async span => {
      const created = await createFixInconsistenciesWorkflowRun(projectId)
      if (!created.ok) {
        sink.send(FixInconsistenciesSseEvent.Error, { message: created.error })
        return
      }
      sink.send(FixInconsistenciesSseEvent.Started, {
        runId: created.run.runId,
        projectId,
        traceId,
      })
      await sink.flush()
      const result = await executeFixInconsistenciesStart(created.run, projectId, {
        tracingOptions: {
          traceId,
          ...(span.spanId ? { parentSpanId: span.spanId } : {}),
        },
        onStep: async stepId => {
          sink.send(FixInconsistenciesSseEvent.Step, { stepId })
          await sink.flush()
        },
      })
      emitFixInconsistenciesStartResult(sink.send, result, projectId)
      await sink.flush()
    })
  )
}
