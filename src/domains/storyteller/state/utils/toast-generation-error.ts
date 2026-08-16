import toast from 'react-hot-toast'

export function toastGenerationError(fallback: string, error: unknown): void {
  if (error instanceof Error && error.message.trim().length > 0) {
    toast.error(error.message)
    return
  }
  toast.error(fallback)
}
