import React from 'react'
import { Maximize2 } from 'lucide-react'

export function ScenePreview() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Scene Preview</span>
      </div>
      <div className="relative aspect-video w-full rounded-md border border-border bg-slate-950 overflow-hidden group">
        <img
          src="/placeholder-scene.jpg"
          alt="Scene Preview"
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-muted-foreground text-xs">3D Scene Viewport</span>
        </div>

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="p-1 bg-background/80 rounded-md cursor-pointer hover:bg-background">
            <Maximize2 className="w-4 h-4 text-foreground" />
          </div>
        </div>
      </div>
    </div>
  )
}
