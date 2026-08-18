import React, { useEffect, useState } from 'react'
import { Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { TESTABLE_LLM_PROVIDERS } from '@/shared/data/constants/llm-providers'
import { KeyboardKey } from '@/shared/data/constants/protocol'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'
import type { ProviderStatus, ProviderTestResult } from '@/domains/2d-canvas/core/io/settings.api'
import {
  SETTINGS_PROJECT_COPY,
  SETTINGS_PROJECT_NAME_INPUT_ID,
  SETTINGS_PROVIDER_COPY,
} from '@/domains/2d-canvas/constants/settings-dialog'
import { ConnectionDot, TestableProviderRow } from './SettingsDialogProviderRow'

interface SettingsDialogGeneralTabProps {
  providers: ProviderStatus | null
  loadingProviders: boolean
  providerTests: Record<string, ProviderTestResult>
  testingProvider: string | null
  onRunProviderTest: (providerKey: string) => void
}

function SettingsDialogProjectNameSection() {
  const currentProject = useWorkspaceProjectStore(state => state.currentProject)
  const renameProject = useWorkspaceProjectStore(state => state.renameProject)
  const [projectName, setProjectName] = useState(currentProject?.name ?? '')
  const [isSavingName, setIsSavingName] = useState(false)

  useEffect(() => {
    setProjectName(currentProject?.name ?? '')
  }, [currentProject?.id, currentProject?.name])

  const trimmedName = projectName.trim()
  const canSave =
    Boolean(currentProject) &&
    trimmedName.length > 0 &&
    trimmedName !== currentProject?.name &&
    !isSavingName

  const handleSaveName = async () => {
    const name = projectName.trim()
    if (!currentProject || !name || name === currentProject.name) return
    setIsSavingName(true)
    try {
      const ok = await renameProject(currentProject.id, name)
      if (ok) {
        toast.success(SETTINGS_PROJECT_COPY.SavedToast)
        return
      }
      toast.error(SETTINGS_PROJECT_COPY.SaveFailedToast)
    } finally {
      setIsSavingName(false)
    }
  }

  return (
    <div>
      <h3 className="text-lg font-medium mb-4">{SETTINGS_PROJECT_COPY.Title}</h3>
      <div className="p-4 rounded-lg bg-zinc-900/20 border border-zinc-900 space-y-3">
        <label className="text-sm font-medium" htmlFor={SETTINGS_PROJECT_NAME_INPUT_ID}>
          {SETTINGS_PROJECT_COPY.NameLabel}
        </label>
        <div className="flex gap-2">
          <Input
            id={SETTINGS_PROJECT_NAME_INPUT_ID}
            value={projectName}
            disabled={!currentProject || isSavingName}
            placeholder={
              currentProject
                ? SETTINGS_PROJECT_COPY.NamePlaceholder
                : SETTINGS_PROJECT_COPY.NoProject
            }
            onChange={event => setProjectName(event.target.value)}
            onKeyDown={event => {
              if (event.key === KeyboardKey.Enter) void handleSaveName()
            }}
          />
          <Button size="sm" disabled={!canSave} onClick={() => void handleSaveName()}>
            {SETTINGS_PROJECT_COPY.Save}
          </Button>
        </div>
      </div>
    </div>
  )
}

export const SettingsDialogGeneralTab: React.FC<SettingsDialogGeneralTabProps> = ({
  providers,
  loadingProviders,
  providerTests,
  testingProvider,
  onRunProviderTest,
}) => (
  <div className="space-y-6">
    <SettingsDialogProjectNameSection />
    <div>
      <h3 className="text-lg font-medium mb-4">{SETTINGS_PROVIDER_COPY.Title}</h3>
      <div className="p-4 rounded-lg bg-zinc-900/20 border border-zinc-900 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Info className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            {SETTINGS_PROVIDER_COPY.EnvHintBefore}{' '}
            <code className="text-xs">{SETTINGS_PROVIDER_COPY.EnvFile}</code>{' '}
            {SETTINGS_PROVIDER_COPY.EnvHintAfter}
          </p>
        </div>

        {loadingProviders ? (
          <div className="text-xs text-muted-foreground py-4 text-center">
            {SETTINGS_PROVIDER_COPY.Loading}
          </div>
        ) : providers ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h5 className="text-xs font-medium font-mono text-muted-foreground uppercase tracking-wider">
                {SETTINGS_PROVIDER_COPY.SectionOpenRouter}
              </h5>
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
                {SETTINGS_PROVIDER_COPY.SectionApiFrame}
              </h5>
              <ConnectionDot connected={providers.apiframe} label={SETTINGS_PROVIDER_COPY.LabelApiFrame} />
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-medium font-mono text-muted-foreground uppercase tracking-wider">
                {SETTINGS_PROVIDER_COPY.SectionTools}
              </h5>
              <ConnectionDot connected={providers.fal} label={SETTINGS_PROVIDER_COPY.LabelFal} />
              <ConnectionDot connected={providers.voyage} label={SETTINGS_PROVIDER_COPY.LabelVoyage} />
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-medium font-mono text-muted-foreground uppercase tracking-wider">
                {SETTINGS_PROVIDER_COPY.Section3d}
              </h5>
              <ConnectionDot connected={providers.hyper3d} label={SETTINGS_PROVIDER_COPY.LabelHyper3d} />
              <ConnectionDot connected={providers.meshy} label={SETTINGS_PROVIDER_COPY.LabelMeshy} />
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground py-4 text-center">
            {SETTINGS_PROVIDER_COPY.Failed}
          </div>
        )}
      </div>
    </div>
  </div>
)
