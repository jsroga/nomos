import {
  ASSET_UPLOAD_ENDPOINT,
  ASSET_UPLOAD_FORM_FIELD_FILE,
  ASSET_UPLOAD_FORM_FIELD_PROJECT_ID,
  ASSET_UPLOAD_HTTP_METHOD,
  AssetUploadStatus,
  AssetUploadXhrEvent,
  assetKindFromFileName,
  validateAssetUploadFile,
  type AssetKind,
  type AssetUploadReject,
} from './constants/asset-upload'

export type AssetUploadQueueItem = {
  id: string
  projectId: string
  fileName: string
  kind: AssetKind
  status: AssetUploadStatus
  progress: number
  file: File
  onComplete?: () => void
}

const xhrById = new Map<string, XMLHttpRequest>()
let items: AssetUploadQueueItem[] = []
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function setItems(next: AssetUploadQueueItem[]) {
  items = next
  emit()
}

export function subscribeAssetUploadQueue(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getAssetUploadQueue(): AssetUploadQueueItem[] {
  return items
}

function patchItem(id: string, patch: Partial<AssetUploadQueueItem>) {
  setItems(items.map(item => (item.id === id ? { ...item, ...patch } : item)))
}

function pump() {
  if (items.some(item => item.status === AssetUploadStatus.Uploading)) return
  const next = items.find(item => item.status === AssetUploadStatus.Pending)
  if (!next) return
  startUpload(next)
}

function startUpload(item: AssetUploadQueueItem) {
  patchItem(item.id, { status: AssetUploadStatus.Uploading, progress: 0 })
  const formData = new FormData()
  formData.append(ASSET_UPLOAD_FORM_FIELD_FILE, item.file)
  formData.append(ASSET_UPLOAD_FORM_FIELD_PROJECT_ID, item.projectId)
  const xhr = new XMLHttpRequest()
  xhrById.set(item.id, xhr)

  xhr.upload.addEventListener(AssetUploadXhrEvent.Progress, event => {
    if (!event.lengthComputable) return
    const progress = Math.round((event.loaded / event.total) * 100)
    patchItem(item.id, { progress })
  })

  xhr.addEventListener(AssetUploadXhrEvent.Load, () => {
    xhrById.delete(item.id)
    if (xhr.status === 200) {
      setItems(getAssetUploadQueue().filter(entry => entry.id !== item.id))
      item.onComplete?.()
      pump()
      return
    }
    patchItem(item.id, { status: AssetUploadStatus.Error })
    pump()
  })

  xhr.addEventListener(AssetUploadXhrEvent.Error, () => {
    xhrById.delete(item.id)
    patchItem(item.id, { status: AssetUploadStatus.Error })
    pump()
  })

  xhr.open(ASSET_UPLOAD_HTTP_METHOD, ASSET_UPLOAD_ENDPOINT)
  xhr.send(formData)
}

export type AssetUploadRejection = {
  fileName: string
  reason: AssetUploadReject
}

export function enqueueAssetUploads(input: {
  projectId: string
  files: FileList | File[]
  onComplete?: () => void
}): AssetUploadRejection[] {
  const rejected: AssetUploadRejection[] = []
  const incoming = Array.from(input.files)
  const accepted: AssetUploadQueueItem[] = []
  for (const file of incoming) {
    const reason = validateAssetUploadFile(file)
    if (reason) {
      rejected.push({ fileName: file.name, reason })
      continue
    }
    accepted.push({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      projectId: input.projectId,
      fileName: file.name,
      kind: assetKindFromFileName(file.name),
      status: AssetUploadStatus.Pending,
      progress: 0,
      file,
      onComplete: input.onComplete,
    })
  }
  if (accepted.length > 0) {
    setItems([...items, ...accepted])
    pump()
  }
  return rejected
}

export function cancelAssetUpload(id: string) {
  const xhr = xhrById.get(id)
  if (xhr) {
    xhr.abort()
    xhrById.delete(id)
  }
  setItems(items.filter(item => item.id !== id))
  pump()
}

export function retryAssetUpload(id: string) {
  patchItem(id, { status: AssetUploadStatus.Pending, progress: 0 })
  pump()
}
