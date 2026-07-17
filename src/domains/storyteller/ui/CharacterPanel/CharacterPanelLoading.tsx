import React from 'react'

export const CharacterPanelLoading: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-4 bg-muted/40 rounded w-1/4"></div>
      <div className="h-6 w-6 bg-muted/40 rounded"></div>
    </div>
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-black border border-white/5 rounded-lg p-3 h-20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-muted/20"></div>
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-muted/20 rounded w-1/3"></div>
              <div className="h-2 bg-muted/10 rounded w-1/4"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)
