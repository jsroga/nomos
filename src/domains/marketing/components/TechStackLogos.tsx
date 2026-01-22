'use client'

import { motion } from 'framer-motion'

const TechLogo = ({
  name,
  children,
  delay,
}: {
  name: string
  children: React.ReactNode
  delay: number
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
    className="flex flex-col items-center gap-3 group px-6 grayscale hover:grayscale-0 transition-all duration-500 opacity-50 hover:opacity-100"
  >
    <div className="h-12 w-auto flex items-center justify-center text-white">{children}</div>
    <span className="text-[10px] font-mono tracking-widest uppercase text-white/40 group-hover:text-primary/70 transition-colors">
      {name}
    </span>
  </motion.div>
)

export const TechStackLogos = () => {
  return (
    <div className="w-full border-y border-white/5 bg-black/40 backdrop-blur-sm overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-wrap justify-center items-center gap-12 md:gap-20">
        {/* UNITY */}
        <TechLogo name="Unity" delay={0.1}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
            <path d="M12.0003 0.600098L4.35034 5.9501L6.75034 11.2501H17.2503L19.6503 5.9501L12.0003 0.600098ZM2.85034 9.1501L0.600342 20.8501L10.3503 23.4001L8.55034 13.9501L2.85034 9.1501ZM21.1503 9.1501L15.4503 13.9501L13.6503 23.4001L23.4003 20.8501L21.1503 9.1501Z" />
          </svg>
        </TechLogo>

        {/* UNREAL ENGINE */}
        <TechLogo name="Unreal" delay={0.2}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
            <path d="M12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0ZM15.4 17.5C14.8 17.9 14.1 18 13.5 17.8C13.2 17.7 12.8 17.4 12.6 17.2C12.4 17 12.4 16.8 12.6 16.6L12.7 16.5C12.9 16.3 13.2 16.4 13.4 16.5C13.6 16.6 13.9 16.6 14.1 16.4C14.3 16.2 14.3 15.9 14.1 15.7L12.9 14.5C12.7 14.3 12.7 14 12.9 13.8L13.8 12.9C14 12.7 14.3 12.7 14.5 12.9C14.7 13.1 14.8 13.4 14.8 13.7C14.8 14.3 14.6 14.9 14.2 15.4C13.8 15.9 13.3 16.2 12.7 16.2H12.6C12.3 16.2 12.1 16.4 12.1 16.7V16.8C12.1 17.1 12.3 17.3 12.6 17.3H12.7C13.6 17.3 14.4 17 15.1 16.4C15.8 15.8 16.2 14.9 16.2 13.9V13.8C16.2 12.8 15.8 11.9 15.1 11.3C14.4 10.7 13.5 10.4 12.6 10.4H12.1C11.8 10.4 11.6 10.2 11.6 9.9V9.8C11.6 9.5 11.8 9.3 12.1 9.3H12.7C13.3 9.3 13.8 9.6 14.2 10.1C14.6 10.6 14.8 11.2 14.8 11.8C14.8 12.1 14.7 12.4 14.5 12.6C14.3 12.8 14 12.8 13.8 12.6L12.9 11.7C12.7 11.5 12.7 11.2 12.9 11L14.1 9.8C14.3 9.6 14.3 9.3 14.1 9.1C13.9 8.9 13.6 8.9 13.4 9C13.2 9.1 12.9 9.2 12.7 9C12.8 8.7 13.2 8.4 13.5 8.3C14.1 8.1 14.8 8.2 15.4 8.6C16.9 9.9 16.9 12.2 15.4 13.5L15.4 17.5Z" />
          </svg>
        </TechLogo>

        {/* GODOT */}
        <TechLogo name="Godot" delay={0.3}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
            <circle cx="12" cy="12" r="10" />
            <path
              d="M12 7C9 7 7 9 7 12H17C17 9 15 7 12 7ZM10.5 11.5C10.5 11.7761 10.2761 12 10 12C9.72386 12 9.5 11.7761 9.5 11.5C9.5 11.2239 9.72386 11 10 11C10.2761 11 10.5 11.2239 10.5 11.5ZM14.5 11.5C14.5 11.7761 14.2761 12 14 12C13.7239 12 13.5 11.7761 13.5 11.5C13.5 11.2239 13.7239 11 14 11C14.2761 11 14.5 11.2239 14.5 11.5Z"
              fill="black"
            />
          </svg>
        </TechLogo>

        {/* GLTF */}
        <TechLogo name="glTF" delay={0.4}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-auto h-8">
            <path d="M2.5 7h4v2h-4v-2zm0 4h3v2h-3v-2zm0 4h4v2h-4v-2zM9 7h8v10h-2v-8h-4v8h-2v-10zm11 0h1.5v2h-1.5v2h1.5v2h-1.5v4h-2v-10z" />
          </svg>
        </TechLogo>

        {/* FBX */}
        <TechLogo name="FBX" delay={0.5}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-auto h-8">
            <path d="M4 7h5v2h-3v2h2v2h-2v4h-2v-10zm7 0h4c.55 0 1 .45 1 1v3c0 .55-.45 1-1 1h-2v1h2c.55 0 1 .45 1 1v2c0 .55-.45 1-1 1h-4v-10zm2 2v2h2v-2h-2zm0 6h2v-2h-2v2zm7-8l-2 10h-2l-1.5-4l-1.5 4h-2l2-10h2l1.5 4l1.5-4h2z" />
          </svg>
        </TechLogo>
      </div>
    </div>
  )
}
