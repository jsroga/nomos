import React from 'react'
import { readString, recordFromJson, stringArrayFromJson } from '@/shared/data/json-guards'
import { SidebarGenerationDebugFormat } from './constants/sidebar-generation-debug'

interface SidebarGenerationDebugPanelProps {
  debug: Record<string, unknown>
}

export const SidebarGenerationDebugPanel: React.FC<SidebarGenerationDebugPanelProps> = ({
  debug,
}) => {
  const neighbors = recordFromJson(debug.neighbors)
  const neighborSrc = (key: string) => readString(neighbors[key])
  const weighted = stringArrayFromJson(debug.weightedNeighbors).join(SidebarGenerationDebugFormat.ListSeparator) || SidebarGenerationDebugFormat.EmptyPlaceholder
  const assembledContext = readString(debug.assembledContext)
  const canonicalContext = readString(debug.canonicalContext)
  const prompt = readString(debug.prompt)

  return (
    <div className="mt-3 bg-zinc-900/30 p-3 rounded-lg border border-zinc-800/50">
      <h4 className="text-xs font-semibold mb-2">Debug Context</h4>
      <div className="text-[10px] text-zinc-500 bg-zinc-950 p-2 rounded border border-zinc-800 mb-2">
        Provider: {readString(debug.provider) ?? 'unknown'} | Variant:{' '}
        {readString(debug.contextVariant) ?? 'canonicalFullContext'}
      </div>
      {readString(debug.contextStrategy) && (
        <div className="text-[10px] text-zinc-500 bg-zinc-950 p-2 rounded border border-zinc-800 mb-2">
          Strategy: {readString(debug.contextStrategy)} | Weighted: {weighted}
        </div>
      )}
      {assembledContext && (
        <div className="mb-2">
          <p className="text-[10px] text-muted-foreground mb-1">Provider Input Context</p>
          <img
            src={assembledContext}
            className="w-full h-auto border border-border rounded"
            alt="Assembled Context"
          />
        </div>
      )}
      {canonicalContext && (
        <div className="mb-2">
          <p className="text-[10px] text-muted-foreground mb-1">Canonical Full Context</p>
          <img
            src={canonicalContext}
            className="w-full h-auto border border-border rounded"
            alt="Canonical Context"
          />
        </div>
      )}
      <div className="grid grid-cols-3 gap-1 mb-2">
        <div className="col-start-2 text-center text-[10px]">Up</div>
        <div className="col-start-1 row-start-2 text-center text-[10px]">Left</div>
        <div className="col-start-2 row-start-2 border border-dashed border-border aspect-square flex items-center justify-center text-[10px] text-muted-foreground">
          Target
        </div>
        <div className="col-start-3 row-start-2 text-center text-[10px]">Right</div>
        <div className="col-start-2 row-start-3 text-center text-[10px]">Down</div>
        {neighborSrc('topLeft') && (
          <img
            src={neighborSrc('topLeft')}
            className="col-start-1 row-start-1 w-full h-full object-cover border border-border"
            alt=""
          />
        )}
        {neighborSrc('up') && (
          <img
            src={neighborSrc('up')}
            className="col-start-2 row-start-1 w-full h-full object-cover border border-border"
            alt=""
          />
        )}
        {neighborSrc('topRight') && (
          <img
            src={neighborSrc('topRight')}
            className="col-start-3 row-start-1 w-full h-full object-cover border border-border"
            alt=""
          />
        )}
        {neighborSrc('left') && (
          <img
            src={neighborSrc('left')}
            className="col-start-1 row-start-2 w-full h-full object-cover border border-border"
            alt=""
          />
        )}
        {neighborSrc('right') && (
          <img
            src={neighborSrc('right')}
            className="col-start-3 row-start-2 w-full h-full object-cover border border-border"
            alt=""
          />
        )}
        {neighborSrc('bottomLeft') && (
          <img
            src={neighborSrc('bottomLeft')}
            className="col-start-1 row-start-3 w-full h-full object-cover border border-border"
            alt=""
          />
        )}
        {neighborSrc('down') && (
          <img
            src={neighborSrc('down')}
            className="col-start-2 row-start-3 w-full h-full object-cover border border-border"
            alt=""
          />
        )}
        {neighborSrc('bottomRight') && (
          <img
            src={neighborSrc('bottomRight')}
            className="col-start-3 row-start-3 w-full h-full object-cover border border-border"
            alt=""
          />
        )}
      </div>
      {prompt && (
        <div className="text-[10px] text-zinc-500 bg-zinc-950 p-2 rounded border border-zinc-800">
          Prompt: {prompt}
        </div>
      )}
    </div>
  )
}
