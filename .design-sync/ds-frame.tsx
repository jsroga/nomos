// design-sync preview frame: the DS is dark-first, but preview cards render on
// the product's white card chrome — this provider gives every story the app's
// real dark surface. Wired via cfg.provider + cfg.extraEntries; not a DS component.
import * as React from 'react'

export function DsFrame({ children }: { children?: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'hsl(var(--background))',
        color: 'hsl(var(--foreground))',
        padding: 20,
        borderRadius: 8,
      }}
    >
      {children}
    </div>
  )
}
