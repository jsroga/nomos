import React from 'react'
import { Info } from 'lucide-react'
import { Button } from '@/components/Button'
import { TESTABLE_LLM_PROVIDERS } from '@/shared/data/constants/llm-providers'
import type { ProviderStatus, ProviderTestResult } from '@/domains/world-building-toolkit/core/io/settings.api'
import { ConnectionDot, TestableProviderRow } from './SettingsDialogProviderRow'

interface SettingsDialogGeneralTabProps {
  providers: ProviderStatus | null
  loadingProviders: boolean
  providerTests: Record<string, ProviderTestResult>
  testingProvider: string | null
  onRunProviderTest: (providerKey: string) => void
  onRunAllProviderTests: () => void
}

export const SettingsDialogGeneralTab: React.FC<SettingsDialogGeneralTabProps> = ({
  providers,
  loadingProviders,
  providerTests,
  testingProvider,
  onRunProviderTest,
  onRunAllProviderTests,
}) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-medium mb-4">Provider Status</h3>
      <div className="p-4 rounded-lg bg-zinc-900/20 border border-zinc-900 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Info className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            API keys are managed via environment variables. See{' '}
            <code className="text-xs">.env.local</code> for configuration.
          </p>
        </div>

        {loadingProviders ? (
          <div className="text-xs text-muted-foreground py-4 text-center">
            Loading provider status...
          </div>
        ) : providers ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-medium font-mono text-muted-foreground uppercase tracking-wider">
                  LLM Providers
                </h5>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  disabled={testingProvider !== null}
                  onClick={() => void onRunAllProviderTests()}
                >
                  Test all
                </Button>
              </div>
              {TESTABLE_LLM_PROVIDERS.map(({ key, label }) => (
                <TestableProviderRow
                  key={key}
                  connected={providers[key]}
                  label={label}
                  result={providerTests[key]}
                  testing={testingProvider === key}
                  onTest={() => void onRunProviderTest(key)}
                />
              ))}
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-medium font-mono text-muted-foreground uppercase tracking-wider">
                Image Generation
              </h5>
              <ConnectionDot connected={providers.legnext} label="LegNext / Midjourney" />
              <ConnectionDot connected={providers.google} label="Gemini Imagen" />
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-medium font-mono text-muted-foreground uppercase tracking-wider">
                Upscaling
              </h5>
              <ConnectionDot connected={providers.stability} label="Stability AI" />
              <ConnectionDot connected={providers.replicate} label="Replicate" />
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-medium font-mono text-muted-foreground uppercase tracking-wider">
                3D Generation
              </h5>
              <ConnectionDot connected={providers.hyper3d} label="Hyper3D" />
              <ConnectionDot connected={providers.meshy} label="Meshy" />
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-medium font-mono text-muted-foreground uppercase tracking-wider">
                Tools
              </h5>
              <ConnectionDot connected={providers.fal} label="Fal.ai" />
              <ConnectionDot connected={providers.voyage} label="Voyage AI" />
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-medium font-mono text-muted-foreground uppercase tracking-wider">
                Observability
              </h5>
              <ConnectionDot connected={providers.langsmith} label="LangSmith" />
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground py-4 text-center">
            Failed to load provider status
          </div>
        )}
      </div>
    </div>

    <div>
      <h3 className="text-lg font-medium mb-4">Generation</h3>
      <div className="p-4 rounded-lg bg-zinc-900/20 border border-zinc-900 space-y-2">
        <p className="text-xs text-muted-foreground">
          First tile uses <span className="text-zinc-300 font-mono">Midjourney</span>, follow-up
          tiles use <span className="text-zinc-300 font-mono">Nano Banana</span>. Providers and API
          keys are managed via environment variables on the server.
        </p>
      </div>
    </div>
  </div>
)
