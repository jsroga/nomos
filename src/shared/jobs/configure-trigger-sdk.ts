import { configure } from '@trigger.dev/sdk'
import { env } from '@/shared/config/env'
import { VercelDeployEnv, TRIGGER_PROD_PREVIEW_BRANCH } from '@/shared/jobs/constants/trigger-preview'

let configured = false

/**
 * Vercel Production always sets VERCEL_GIT_COMMIT_REF (e.g. main). The SDK
 * treats that as a Trigger preview branch and sends x-trigger-branch, which
 * 401s with "No matching branch env" against a prod key. Preview and local
 * keep the SDK defaults so other jobs still hit the right env.
 */
export function configureTriggerSdk(): void {
  if (configured) return
  configured = true
  if (env.VERCEL_ENV !== VercelDeployEnv.Production) return
  configure({ previewBranch: TRIGGER_PROD_PREVIEW_BRANCH })
}

configureTriggerSdk()
