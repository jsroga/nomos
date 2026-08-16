import React from 'react'
import { Info } from 'lucide-react'
import { Button } from '@/components/Button'
import { TESTABLE_LLM_PROVIDERS } from '@/shared/data/constants/llm-providers'
import type { ProviderStatus, ProviderTestResult } from '@/domains/2d-canvas/core/io/settings.api'
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
              <ConnectionDot connected={providers.apiframe} label="Apiframe (tiles, posters, moodboard)" />
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-medium font-mono text-muted-foreground uppercase tracking-wider">
                Upscaling & edit
              </h5>
              <ConnectionDot connected={providers.apiframe} label="Apiframe (Topaz / Clarity / Flux Fill)" />
              <ConnectionDot connected={providers.apiframe} label="Midjourney upsample" />
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
          Pixel paths use <span className="text-zinc-300 font-mono">APIFRAME_API_KEY</span>. Per-surface
          models: <span className="text-zinc-300 font-mono">IMAGE_TILE_FIRST_MODEL</span>,{' '}
          <span className="text-zinc-300 font-mono">IMAGE_TILE_FOLLOW_UP_MODEL</span>,{' '}
          <span className="text-zinc-300 font-mono">IMAGE_UPSCALE_MODEL</span>,{' '}
          <span className="text-zinc-300 font-mono">IMAGE_UPSCALE_MODE</span>,{' '}
          <span className="text-zinc-300 font-mono">IMAGE_MOODBOARD_MODEL</span>,{' '}
          <span className="text-zinc-300 font-mono">IMAGE_STORYBOARD_MODEL</span>,{' '}
          <span className="text-zinc-300 font-mono">IMAGE_FIDELITY_MODEL</span> (see{' '}
          <span className="text-zinc-300 font-mono">.env.local.example</span>).
        </p>
      </div>
    </div>
  </div>
)
