import { GlowEffect } from 'world-building-kit'

export const CardGlow = () => (
  <div className="relative h-44 w-80">
    <GlowEffect
      colors={['#5b6cff', '#8b5cf6', '#22d3ee']}
      mode="static"
      blur="medium"
      className="rounded-xl"
    />
    <div className="relative flex h-full flex-col justify-center rounded-xl border border-border bg-card p-6">
      <h3 className="text-lg">Pro plan</h3>
      <p className="text-sm text-muted-foreground">
        Unlimited episodes, 3D exports, and multi-agent generation.
      </p>
    </div>
  </div>
)

export const SpotlightGlow = () => (
  <div className="relative h-44 w-80">
    <GlowEffect colors={['#5b6cff']} mode="spotlight" blur="strong" className="rounded-xl" />
    <div className="relative flex h-full items-center justify-center rounded-xl border border-border bg-card">
      <span className="font-mono text-sm text-muted-foreground">hover spotlight</span>
    </div>
  </div>
)
