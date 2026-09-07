'use client'

import type { CSSProperties, FC } from 'react'

export enum ScriptGhostShadowClass {
  Layer = 'pointer-events-none absolute inset-0 select-none overflow-visible whitespace-pre-wrap px-16 py-12',
  Prefix = 'invisible',
  Ghost = 'opacity-40',
}

export interface ScriptEditorGhostOverlayProps {
  ghost: string
  prefix: string
  style: CSSProperties
}

export const ScriptEditorGhostOverlay: FC<ScriptEditorGhostOverlayProps> = ({
  ghost,
  prefix,
  style,
}) => {
  if (!ghost) return null
  return (
    <div aria-hidden className={ScriptGhostShadowClass.Layer} style={style}>
      <span className={ScriptGhostShadowClass.Prefix}>{prefix}</span><span className={ScriptGhostShadowClass.Ghost}>{ghost}</span>
    </div>
  )
}
