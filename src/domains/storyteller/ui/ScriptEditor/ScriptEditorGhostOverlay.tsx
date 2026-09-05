'use client'

import type { FC } from 'react'

export enum ScriptGhostOverlayCopy {
  AcceptHint = 'Tab to accept · Esc to dismiss',
}

export interface ScriptEditorGhostOverlayProps {
  ghost: string
}

export const ScriptEditorGhostOverlay: FC<ScriptEditorGhostOverlayProps> = ({ ghost }) => {
  if (!ghost) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 mx-auto max-w-[72ch] px-16">
      <p className="whitespace-pre-wrap text-sm italic text-muted-foreground/70">{ghost}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground/50">
        {ScriptGhostOverlayCopy.AcceptHint}
      </p>
    </div>
  )
}
