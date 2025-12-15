'use client'

export function FluidHeadline({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative z-10 font-black tracking-tighter font-syne text-left">
            <h1
                className="text-5xl md:text-7xl lg:text-8xl text-white drop-shadow-2xl font-syne"
                style={{
                    textShadow: '0 0 40px rgba(255, 255, 255, 0.3)'
                }}
            >
                {children}
            </h1>

            {/* Subtle underlined accent */}
            <div className="mt-6 w-32 h-1 bg-gradient-to-r from-white/20 to-transparent" />
        </div>
    )
}
