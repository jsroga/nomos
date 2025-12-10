import React from 'react'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { Loader2 } from 'lucide-react'

// This component is deprecated in favor of the global AsyncStatusIndicator
// which handles operation status display in the header.
// Kept for now to avoid breaking imports if any exist that grep missed.
export const GenerationStatus: React.FC = () => {
  return null
}
