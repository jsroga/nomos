'use client'

import { motion } from 'framer-motion'
import { ThreeDIcon } from './ThreeDIcon'

// Custom tool icons
const TOOL_ICONS = {
  unity: (
    <svg viewBox="0 0 64 64" fill="currentColor" className="w-10 h-10">
      <path d="M42.7 32l10.3-18-6-1-8.3 14.4L30.4 13h-12l16 19-16 19h12l8.3-14.4L47 51l6-1-10.3-18z" />
      <path d="M26 13l-16 19 16 19h-8L4 32l14-19h8z" opacity="0.7" />
    </svg>
  ),
  unreal: (
    <svg viewBox="0 0 116 116" fill="currentColor" className="w-10 h-10">
      <path
        fillRule="evenodd"
        d="M79.43 63.498c-.61 2.942-3.324 10.487-11.973 14.574l-3.47-3.905-5.858 5.892a21.634 21.634 0 0 1-17.108-8.775 8.433 8.433 0 0 0 1.918.36c.959.017 1.998-.334 1.998-1.952V53.8a2.617 2.617 0 0 0-3.293-2.618c-2.712.62-4.881 7.39-4.881 7.39a21.532 21.532 0 0 1 7.454-16.5C48.256 38.649 52.202 37.465 55.2 37c-2.961 1.688-4.627 4.443-4.627 6.756 0 3.707 2.239 3.27 2.902 2.722v21.46c.113.27.258.524.434.757a3.166 3.166 0 0 0 2.597 1.31c2.243 0 5.152-2.56 5.152-2.56V50.07c0-1.768-1.332-3.905-2.666-4.634 0 0 2.469-.434 4.378 1.022.358-.439.739-.858 1.141-1.256 4.439-4.36 8.628-5.597 12.116-6.218 0 0-6.35 4.99-6.35 11.672 0 4.974.128 17.103.128 17.103 2.363 2.269 5.862-1.007 9.025-4.26Z"
        clipRule="evenodd"
      />
      <path
        fillRule="evenodd"
        d="M58.409 23.035a35.376 35.376 0 1 0 .004 70.751 35.376 35.376 0 0 0-.004-70.75Zm0 69.335a33.962 33.962 0 1 1-.004-67.923 33.962 33.962 0 0 1 .004 67.923Z"
        clipRule="evenodd"
      />
    </svg>
  ),
  blender: (
    <svg viewBox="0 0 64 64" fill="currentColor" className="w-10 h-10">
      <ellipse cx="40" cy="36" rx="16" ry="12" />
      <ellipse cx="40" cy="36" rx="10" ry="7" fill="black" />
      <ellipse cx="42" cy="35" rx="3" ry="2" />
      <path
        d="M6 32h20M18 24l12 8-12 8"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  godot: (
    <svg viewBox="0 0 64 64" fill="currentColor" className="w-10 h-10">
      <path d="M12 28c0-11 9-20 20-20s20 9 20 20v16c0 6-4 12-10 14H22c-6-2-10-8-10-14V28z" />
      <circle cx="32" cy="4" r="3" />
      <rect x="30" y="6" width="4" height="6" />
      <ellipse cx="22" cy="32" rx="6" ry="7" fill="black" />
      <ellipse cx="42" cy="32" rx="6" ry="7" fill="black" />
      <ellipse cx="24" cy="31" rx="2" ry="2.5" />
      <ellipse cx="44" cy="31" rx="2" ry="2.5" />
      <rect x="26" y="46" width="12" height="3" rx="1" fill="black" />
    </svg>
  ),
  maya: (
    <svg viewBox="0 0 64 64" fill="currentColor" className="w-10 h-10">
      <path d="M32 6 L38 20 L32 16 L26 20 Z" />
      <path d="M32 16 L44 26 L32 24 L20 26 Z" />
      <path d="M20 26 L8 38 L20 36 L24 46 L32 34 L40 46 L44 36 L56 38 L44 26" />
      <path d="M24 46 L20 58 L32 50 L44 58 L40 46 L32 34 Z" />
      <circle cx="32" cy="34" r="4" />
    </svg>
  ),
  photoshop: (
    <svg viewBox="0 0 64 64" fill="currentColor" className="w-10 h-10">
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="8"
        ry="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path d="M16 48V16h8c6 0 10 4 10 9s-4 9-10 9h-4v14h-4zm4-18h4c3.5 0 6-2 6-5s-2.5-5-6-5h-4v10z" />
      <path d="M38 34c0-3 2.5-5 6-5 2 0 3.5.5 5 1.5l-1.5 3c-1-.7-2-1-3-1-1.5 0-2.5.7-2.5 1.8 0 3 7.5 1.5 7.5 7.2 0 3.2-2.5 5.5-6.5 5.5-2.5 0-4.5-.8-6-2l1.5-3c1.2 1 2.8 1.5 4.2 1.5 1.8 0 2.8-.8 2.8-2 0-3.2-7.5-1.5-7.5-7z" />
    </svg>
  ),
}

const ToolIcon = ({
  name,
  icon,
  delay,
}: {
  name: string
  icon: React.ReactNode
  delay: number
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
    className="flex flex-col items-center gap-4 group min-w-[100px]"
  >
    <div className="h-20 w-20 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl group-hover:bg-white/10 group-hover:border-primary/50 group-hover:scale-110 transition-all duration-300 relative overflow-hidden">
      {/* Background glow on hover */}
      <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative z-10 text-white/70 group-hover:text-white transition-colors">
        {icon}
      </div>
    </div>
    <span className="text-[10px] font-mono tracking-widest uppercase text-white/40 group-hover:text-primary transition-colors">
      {name}
    </span>
  </motion.div>
)

export const ToolsIntegration = () => {
  return (
    <section className="py-24 border-y border-white/5 bg-black/40 backdrop-blur-sm relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12 mb-16">
          <div className="text-center md:text-left flex-1">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-black font-syne uppercase leading-tight mb-4"
            >
              Keep Your Tools.
              <br />
              <span className="text-primary">Add More Power.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-white/50 font-mono max-w-md text-sm leading-relaxed"
            >
              Works seamlessly with industry-standard tools so you can keep using what&apos;s
              familiar—while accelerating workflows with AI.
            </motion.p>
          </div>

          {/* Decorative 3D Icon on Right */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="hidden md:block w-[800px] h-[800px] absolute -right-[200px] -top-[200px] pointer-events-none"
          >
            <ThreeDIcon glowScale={0.1} density={0.8} type="WORLD_GEN" color="#5c7cfa" size={1200} scale={1} />
          </motion.div>
        </div>

        <div className="flex flex-wrap justify-center md:justify-start gap-8 md:gap-12">
          <ToolIcon name="Unity" icon={TOOL_ICONS.unity} delay={0.1} />
          <ToolIcon name="Unreal" icon={TOOL_ICONS.unreal} delay={0.15} />
          <ToolIcon name="Blender" icon={TOOL_ICONS.blender} delay={0.2} />
          <ToolIcon name="Godot" icon={TOOL_ICONS.godot} delay={0.25} />
          <ToolIcon name="Maya" icon={TOOL_ICONS.maya} delay={0.3} />
          <ToolIcon name="Photoshop" icon={TOOL_ICONS.photoshop} delay={0.35} />
        </div>
      </div>

      {/* Background Texture */}
      <div
        className="absolute inset-0 opacity-[0.2] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at center, #1a1a1a 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />
    </section>
  )
}
