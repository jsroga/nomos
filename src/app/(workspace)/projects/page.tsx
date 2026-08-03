'use client'

import { ProjectSelectionLayout } from '@/shared/workspace'

/** Projects dashboard — static indigo wash + dot grid; no WebGL. */
export default function ProjectSelectionPage() {
  return (
    <div className="relative h-full min-h-0 w-full bg-[hsl(240_10%_3.9%)] text-[hsl(0_0%_98%)]">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-[0.28]"
          style={{
            backgroundImage:
              'radial-gradient(circle at center, #1a1a1a 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-[420px]"
          style={{
            background:
              'radial-gradient(80% 100% at 50% 0%, hsl(235 88% 65% / .1) 0%, transparent 72%)',
          }}
        />
      </div>
      <ProjectSelectionLayout />
    </div>
  )
}
