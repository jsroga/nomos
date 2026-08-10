'use client'

import { motion } from 'motion/react'
import { LandingManifestoCopy } from '@/domains/marketing/ui/LandingPage/constants/landing-ui-copy'
import {
  LANDING_ABSOLUTE_OVERLAY_CLASS,
  LANDING_SECTION_CONTAINER_CLASS,
  LANDING_SECTION_PAD_Y_CLASS,
  LANDING_SECTION_PANEL_CLASS,
} from '@/domains/marketing/ui/LandingPage/constants/landing-section'

export function ManifestoSection() {
  return (
    <section className={`${LANDING_SECTION_PANEL_CLASS} ${LANDING_SECTION_PAD_Y_CLASS}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="relative w-full overflow-hidden bg-[#ff4400] py-24 text-black md:py-28"
      >
        <div
          className={`${LANDING_ABSOLUTE_OVERLAY_CLASS} mix-blend-overlay`}
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'1\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'1\'/%3E%3C/g%3E%3C/svg%3E")',
            backgroundSize: '12px 12px',
          }}
        />

        <div className={`${LANDING_SECTION_CONTAINER_CLASS} grid items-center gap-16 lg:grid-cols-2`}>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-4 h-4 bg-black rounded-full" />
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-black/60">
                {LandingManifestoCopy.Eyebrow}
              </span>
            </div>

            <h2 className="text-4xl sm:text-6xl md:text-8xl font-black leading-[0.85] font-syne tracking-tight break-keep">
              {LandingManifestoCopy.TitleYouAre}
              <br />
              <span className="text-black/30">{LandingManifestoCopy.TitleThe}</span>
              <br />
              {LandingManifestoCopy.TitleArchitect}
            </h2>
          </div>

          <div className="space-y-8 lg:border-l lg:border-black/10 lg:pl-16 -mt-[100px] -ml-[100px]">
            <p className="text-2xl font-bold font-syne leading-tight max-w-xl">
              &ldquo;{LandingManifestoCopy.QuoteLine1}
              <br />
              {LandingManifestoCopy.QuoteLine2}&rdquo;
            </p>
            <div className="space-y-4">
              <p className="font-mono text-sm font-bold uppercase tracking-widest mb-4 opacity-50">
                {LandingManifestoCopy.BeliefHeading}
              </p>
              <p className="font-mono text-sm leading-relaxed">
                The golden age of gaming isn&apos;t behind us—it&apos;s ahead.
                <br />
                When smaller studios match the output of giants, quality wins.
                <br />
                Corporations are shrinking.
                <br />
                But somewhere, a small team is building the next Disco Elysium.
                <br />
                The next Clair Obscure.
                <br />
                Maybe it&apos;s you.
              </p>
            </div>
          </div>
        </div>

        <div className="absolute -bottom-24 -right-24 text-[30vw] font-black font-syne text-black opacity-[0.05] leading-none pointer-events-none select-none">
          {LandingManifestoCopy.Watermark}
        </div>
      </motion.div>
    </section>
  )
}
