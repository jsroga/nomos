// shared/jobs barrel
// Cross-module job status types, hooks, and Trigger.dev utilities
export { JobQueue, JOB_QUEUE_CONCURRENCY_LIMIT } from '@/shared/jobs/constants/job-queue'
export { MachinePreset, defineOwnedTask, defineScheduledTask, type OwnedTaskPayload } from '@/shared/jobs/define-task'
export { ownedElsewhere } from '@/shared/jobs/payload-schema'
export {
  OWNED_PAYLOAD_SHAPE,
  submissionNonceSchema,
  newSubmissionNonce,
  readSubmissionNonce,
  withSubmissionNonce,
  type Submitted,
} from '@/shared/jobs/submission-nonce'
export { SUBMISSION_NONCE_ERROR, SUBMISSION_NONCE_FIELD } from '@/shared/jobs/constants/submission-nonce'
export { requireSubmissionNonce } from '@/shared/jobs/submission-nonce-http'
export {
  JobAccessError,
  cancelOwnedRun,
  OWNED_RUN_SUMMARY_KEYS,
  projectIdFromRun,
  projectTag,
  retrieveOwnedRun,
  retrieveSystemRun,
  SystemRunReason,
  triggerOwnedRun,
  type OwnedRunSummary,
} from '@/shared/jobs/owned-run'
