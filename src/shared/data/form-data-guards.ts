/** Read a file field from multipart form data. */
export function formFile(formData: FormData, key: string): File | null {
  const value = formData.get(key)
  return value instanceof File ? value : null
}

/** Read a string field from multipart form data. */
export function formString(formData: FormData, key: string): string | null {
  const value = formData.get(key)
  return typeof value === 'string' ? value : null
}

/** Parse an integer field from multipart form data. */
export function formInt(formData: FormData, key: string): number | null {
  const raw = formString(formData, key)
  if (raw === null) return null
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : null
}
