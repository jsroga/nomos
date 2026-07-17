export enum ThreeDPollCopy {
  RecoverHint = 'Task not found. Click "Recover" to try fetching from Meshy.',
  PreviousNotFound = 'Previous generation task not found.',
  GenSuccess = '3D Model generated successfully!',
  RemeshNotFound = 'Remesh task not found.',
  RemeshSuccess = '3D Model remeshed successfully!',
  UploadNotFound = 'Upload task not found.',
  UploadSuccess = 'Upload to Vercel Blob completed!',
  PollGenError = 'Error polling task status:',
  PollRemeshError = 'Error polling remesh status:',
  PollUploadError = 'Error polling upload status:',
  UnknownStatus = 'unknown',
  Completed = 'completed',
  Failed = 'failed',
  WarnIcon = '⚠️',
  InfoIcon = 'ℹ️',
}

export enum ThreeDPollToast {
  MeshyIdSaved = 'Task failed, but Meshy ID saved. Click "Recover" to try fetching result.',
}
