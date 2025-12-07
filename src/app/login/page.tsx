import LoginButton from '@/components/auth/LoginButton'
import { Box, Map, BookOpen, Home } from 'lucide-react'
import { AuroraBackground } from '@/components/ui/aurora-background'

export default function LoginPage() {
  return (
    <AuroraBackground>
      <div className="relative z-10 w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white font-bold text-3xl mb-4 shadow-lg ring-1 ring-white/20">
            T
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white drop-shadow-lg">
            World Building Kit
          </h1>
          <p className="text-white/70 text-lg">
            Create infinite worlds and 3D assets with AI
          </p>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-xl p-8 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-8">
            <div className="flex flex-col items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/5 hover:border-primary/30 transition-colors">
              <Map className="text-primary w-6 h-6" />
              <span className="font-medium">World Gen</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/5 hover:border-primary/30 transition-colors">
              <Box className="text-primary w-6 h-6" />
              <span className="font-medium">3D Export</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/5 hover:border-primary/30 transition-colors">
              <BookOpen className="text-primary w-6 h-6" />
              <span className="font-medium">Storyteller</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/5 hover:border-primary/30 transition-colors">
              <Home className="text-primary w-6 h-6" />
              <span className="font-medium">Interior</span>
            </div>
          </div>

          <div className="space-y-4">
            <LoginButton />
            <p className="text-xs text-center text-muted-foreground/50">
              Continue to access your infinite canvas
            </p>
          </div>
        </div>
      </div>
    </AuroraBackground>
  )
}
