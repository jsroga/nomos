/** Reasons a caller may hold the service-role client. Each is a reviewed decision. */
export enum ServiceRoleReason {
  /** Trigger task writing rows for work it just performed. */
  TaskPersistence = 'task-persistence',
  /** Uploading generated media to storage from a task. */
  StorageUpload = 'storage-upload',
  /** Supabase auth admin API (user metadata). */
  AuthAdmin = 'auth-admin',
}

export const SERVICE_ROLE_ENV_MISSING =
  'SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required for service-role access'

export const SERVICE_ROLE_LOG = {
  ACQUIRED: '[persistence] service-role client acquired:',
} as const
