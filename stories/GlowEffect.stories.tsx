import type { Meta, StoryObj } from '@storybook/react-vite'
import { GlowEffect } from '@/components/GlowEffect'
import { GlowBlurLevel, GlowEffectMode } from '@/components/GlowEffect/constants/glow-effect'
import { enumArgType } from './_helpers/arg-types'

const meta = {
  title: 'Effects/GlowEffect',
  component: GlowEffect,
  args: {
    colors: ['#5b6cff', '#8b5cf6', '#22d3ee'],
    mode: GlowEffectMode.Static,
    blur: GlowBlurLevel.Medium,
    className: 'rounded-xl',
  },
  argTypes: {
    mode: enumArgType(GlowEffectMode),
    blur: enumArgType(GlowBlurLevel),
  },
} satisfies Meta<typeof GlowEffect>

export default meta
type Story = StoryObj<typeof meta>

function GlowCard({
  mode,
  blur,
  caption,
}: {
  mode: `${GlowEffectMode}`
  blur: `${GlowBlurLevel}`
  caption: string
}) {
  return (
    <div className="relative h-44 w-80">
      <GlowEffect colors={['#5b6cff', '#8b5cf6', '#22d3ee']} mode={mode} blur={blur} className="rounded-xl" />
      <div className="relative flex h-full flex-col justify-center rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg">Pro plan</h3>
        <p className="text-sm text-muted-foreground">{caption}</p>
      </div>
    </div>
  )
}

export const Resting: Story = {
  render: () => (
    <GlowCard mode={GlowEffectMode.Static} blur={GlowBlurLevel.Medium} caption="Static glow behind the card." />
  ),
}

export const Hover: Story = {
  render: () => (
    <GlowCard
      mode={GlowEffectMode.Spotlight}
      blur={GlowBlurLevel.Strong}
      caption="Spotlight — hover the card."
    />
  ),
}

export const AlternateColor: Story = {
  render: () => (
    <div className="relative h-44 w-80">
      <GlowEffect
        colors={['#ef4444', '#f59e0b', '#22d3ee']}
        mode={GlowEffectMode.ColorShift}
        blur={GlowBlurLevel.Medium}
        className="rounded-xl"
      />
      <div className="relative flex h-full items-center justify-center rounded-xl border border-border bg-card">
        <span className="font-mono text-sm text-muted-foreground">colorShift</span>
      </div>
    </div>
  ),
}
