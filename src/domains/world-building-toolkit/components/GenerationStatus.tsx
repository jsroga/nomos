import React from 'react'

// This component is deprecated in favor of the global AsyncStatusIndicator
// which handles operation status display in the header.
// Kept for now to avoid breaking imports if any exist that grep missed.
export const GenerationStatus: React.FC = () => {
  return null
}
