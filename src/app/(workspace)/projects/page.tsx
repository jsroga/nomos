'use client'

import { ProjectSelectionLayout } from '@/shared/workspace'

/** Static ambient backdrop — no WebGL / RAF (TurbulentBackground is marketing-only). */
export default function ProjectSelectionPage() {
  return (
    <div className="relative min-h-screen w-full bg-black text-foreground">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(79,70,229,0.22),transparent_55%),radial-gradient(ellipse_at_80%_100%,rgba(59,130,246,0.16),transparent_50%),radial-gradient(ellipse_at_50%_50%,rgba(139,92,246,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.15)_0%,rgba(0,0,0,0.75)_100%)]" />
      </div>
      <ProjectSelectionLayout />
    </div>
  )
}
