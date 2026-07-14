'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { LandingApiMcpCopy } from '@/domains/marketing/ui/LandingPage/constants/landing-ui-copy'
import { ApiIntegrationTab } from '@/domains/marketing/ui/LandingPage/types'

type ApiMcpSectionProps = {
  activeTab: ApiIntegrationTab
  onTabChange: (tab: ApiIntegrationTab) => void
}

export function ApiMcpSection({ activeTab, onTabChange }: ApiMcpSectionProps) {
  return (
    <section className="py-24 relative">
      <div className="absolute left-[50%] top-0 bottom-0 w-px bg-white/5 hidden lg:block" />

      <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7 }}
          className="flex-1 w-full"
        >
          <div className="relative rounded-lg overflow-hidden bg-[#0d0d0d] border border-white/10 min-h-[320px]">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-[10px] font-mono text-white/30 ml-2">
                {activeTab === ApiIntegrationTab.Rest
                  ? LandingApiMcpCopy.RestFilename
                  : LandingApiMcpCopy.McpFilename}
              </span>
            </div>

            <div className="p-6 font-mono text-sm leading-relaxed overflow-x-auto">
              <AnimatePresence mode="wait">
                {activeTab === ApiIntegrationTab.Rest ? (
                  <motion.div
                    key="rest"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="text-white/40">// Generate 3D Assets</div>
                    <div>
                      <span className="text-purple-400">const</span>{' '}
                      <span className="text-blue-300">response</span> ={' '}
                      <span className="text-purple-400">await</span>{' '}
                      <span className="text-yellow-300">fetch</span>(
                      <span className="text-green-300">'/api/generate-3d'</span>, {'{'}
                    </div>
                    <div className="pl-4">
                      <span className="text-blue-300">method</span>:{' '}
                      <span className="text-green-300">'POST'</span>,
                    </div>
                    <div className="pl-4">
                      <span className="text-blue-300">body</span>: JSON.stringify(
                      {'{'}
                    </div>
                    <div className="pl-8">
                      <span className="text-blue-300">imageUrl</span>:{' '}
                      <span className="text-green-300">'/assets/concept.png'</span>,
                    </div>
                    <div className="pl-8">
                      <span className="text-blue-300">provider</span>:{' '}
                      <span className="text-green-300">'meshy'</span>,
                    </div>
                    <div className="pl-8">
                      <span className="text-blue-300">apiKey</span>: process.env.
                      <span className="text-blue-300">MESHY_API_KEY</span>
                    </div>
                    <div className="pl-4">{'}'})</div>
                    <div>{'}'});</div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="mcp"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="text-white/40">// MCP Configuration</div>
                    <div>{'{'}</div>
                    <div className="pl-4">
                      <span className="text-green-300">"mcpServers"</span>: {'{'}
                    </div>
                    <div className="pl-8">
                      <span className="text-green-300">"world-building-kit"</span>: {'{'}
                    </div>
                    <div className="pl-12">
                      <span className="text-green-300">"command"</span>:{' '}
                      <span className="text-green-300">"npx"</span>,
                    </div>
                    <div className="pl-12">
                      <span className="text-green-300">"args"</span>: [
                      <span className="text-green-300">"tsx"</span>,{' '}
                      <span className="text-green-300">"src/mcp/server.ts"</span>]
                    </div>
                    <div className="pl-12">
                      <span className="text-green-300">"env"</span>: {'{'}
                    </div>
                    <div className="pl-16">
                      <span className="text-green-300">"MCP_API_KEY"</span>:{' '}
                      <span className="text-green-300">"your-api-key"</span>
                    </div>
                    <div className="pl-12">{'}'}</div>
                    <div className="pl-8">{'}'}</div>
                    <div className="pl-4">{'}'}</div>
                    <div>{'}'}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="flex-1 text-center lg:text-left"
        >
          <div className="flex items-center gap-4 mb-6 justify-center lg:justify-start">
            <span className="text-4xl font-mono text-white/10 font-black">
              {LandingApiMcpCopy.SectionIndex}
            </span>
            <div className="h-px w-12 bg-primary" />
            <span className="text-xs font-mono text-primary uppercase tracking-widest">
              {LandingApiMcpCopy.Eyebrow}
            </span>
          </div>

          <h3 className="text-4xl md:text-5xl font-black text-white font-syne mb-6 leading-[0.9] uppercase">
            <span className="block">{LandingApiMcpCopy.TitleLine1}</span>
            <span className="block">{LandingApiMcpCopy.TitleLine2}</span>
          </h3>

          <p className="text-lg text-white/60 font-mono leading-relaxed max-w-md mx-auto lg:mx-0 mb-6">
            {LandingApiMcpCopy.Description}
          </p>

          <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
            <button
              onClick={() => onTabChange(ApiIntegrationTab.Rest)}
              className={`px-3 py-1.5 border rounded text-xs font-mono transition-colors cursor-pointer ${
                activeTab === ApiIntegrationTab.Rest
                  ? 'bg-white/10 border-white text-white'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              {LandingApiMcpCopy.RestTab}
            </button>
            <button
              onClick={() => onTabChange(ApiIntegrationTab.Mcp)}
              className={`px-3 py-1.5 border rounded text-xs font-mono transition-colors cursor-pointer ${
                activeTab === ApiIntegrationTab.Mcp
                  ? 'bg-primary/30 border-primary text-primary-300'
                  : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'
              }`}
            >
              {LandingApiMcpCopy.McpTab}
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
