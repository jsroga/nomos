const headerChromeStyle = {
  marginLeft: -25,
  marginRight: -25,
  paddingLeft: 25,
  paddingRight: 25,
} as const

export function WorldBiblePanelLoading() {
  return (
    <div className="h-full flex flex-col relative animate-pulse">
      <div
        className="bg-background/80 border-b border-border/40 h-[60px] flex items-center justify-between rounded-lg"
        style={headerChromeStyle}
      >
        <div className="h-7 w-32 bg-muted/40 rounded"></div>
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-muted/40 rounded"></div>
          <div className="h-8 w-16 bg-muted/40 rounded"></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pt-6 space-y-8">
        <div className="space-y-4">
          <div className="h-6 w-40 bg-muted/40 rounded"></div>
          <div className="grid grid-cols-4 gap-4 h-48">
            <div className="col-span-1 bg-muted/20 rounded-lg"></div>
            <div className="col-span-3 bg-muted/10 rounded-lg"></div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-6 w-32 bg-muted/40 rounded"></div>
          <div className="h-32 bg-muted/10 rounded-lg"></div>
        </div>
        <div className="space-y-4">
          <div className="h-6 w-32 bg-muted/40 rounded"></div>
          <div className="h-32 bg-muted/10 rounded-lg"></div>
        </div>
      </div>
    </div>
  )
}
