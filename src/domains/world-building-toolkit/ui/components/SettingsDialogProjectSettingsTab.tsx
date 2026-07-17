import React from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/Button'
import { cn } from '@/shared/data/utils'
import { STYLE_PRESETS } from '@/shared/data/constants/style-presets'
import type { ProjectStyleSettings } from '@/domains/world-building-toolkit/core/io/settings.api'
import { SettingsStyleMode } from '@/domains/world-building-toolkit/constants/settings-dialog'

interface SettingsDialogProjectSettingsTabProps {
  projectData: ProjectStyleSettings | null
  styleReferenceUrls: string[]
  newStyleUrl: string
  styleMode: SettingsStyleMode
  selectedPreset: string | null
  onStyleModeChange: (mode: SettingsStyleMode) => void
  onSelectedPresetChange: (preset: string | null) => void
  onStyleReferenceUrlsChange: (urls: string[]) => void
  onNewStyleUrlChange: (url: string) => void
  onSaveStyleSettings: (
    mode: SettingsStyleMode,
    preset: string | null,
    urls: string[]
  ) => void
}

export const SettingsDialogProjectSettingsTab: React.FC<SettingsDialogProjectSettingsTabProps> = ({
  projectData,
  styleReferenceUrls,
  newStyleUrl,
  styleMode,
  selectedPreset,
  onStyleModeChange,
  onSelectedPresetChange,
  onStyleReferenceUrlsChange,
  onNewStyleUrlChange,
  onSaveStyleSettings,
}) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-medium mb-4">Project Settings</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Configure project-specific settings for{' '}
        <strong>{projectData?.name || 'this project'}</strong>
      </p>

      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-semibold mb-3">Style References</h4>
          <p className="text-xs text-muted-foreground mb-4">
            Choose a predefined style preset or provide your own Midjourney style reference URLs
            (--sref parameter). Applied to all image generation.
          </p>

          <div className="flex gap-1 p-1 bg-muted/40 rounded-lg mb-4 w-fit">
            <button
              onClick={() => onStyleModeChange(SettingsStyleMode.Custom)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                styleMode === SettingsStyleMode.Custom
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Custom URLs
            </button>
            <button
              onClick={() => onStyleModeChange(SettingsStyleMode.Preset)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                styleMode === SettingsStyleMode.Preset
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Presets
            </button>
          </div>

          {styleMode === SettingsStyleMode.Preset && (
            <div className="grid grid-cols-2 gap-2">
              {STYLE_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => {
                    const newPreset = selectedPreset === preset.id ? null : preset.id
                    onSelectedPresetChange(newPreset)
                    onSaveStyleSettings(SettingsStyleMode.Preset, newPreset, [])
                  }}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left',
                    selectedPreset === preset.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-muted-foreground/30 bg-muted/20'
                  )}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                    style={{ backgroundColor: preset.color + '25' }}
                  >
                    {preset.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{preset.name}</div>
                    <div className="text-xs text-muted-foreground">{preset.description}</div>
                  </div>
                  {selectedPreset === preset.id && (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {styleMode === SettingsStyleMode.Custom && (
            <div>
              {styleReferenceUrls.length > 0 && (
                <div className="space-y-2 mb-4">
                  {styleReferenceUrls.map((url, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-muted/30 rounded-md border border-border"
                    >
                      <span className="text-xs flex-1 truncate font-mono">{url}</span>
                      <button
                        onClick={() => {
                          const updated = styleReferenceUrls.filter((_, i) => i !== index)
                          onStyleReferenceUrlsChange(updated)
                          onSaveStyleSettings(SettingsStyleMode.Custom, null, updated)
                        }}
                        className="text-destructive hover:text-destructive/80 text-xs px-2 py-1"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="url"
                  value={newStyleUrl}
                  onChange={e => onNewStyleUrlChange(e.target.value)}
                  placeholder="https://s.mj.run/..."
                  className="flex-1 p-2 rounded-md border border-input bg-background text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (newStyleUrl && newStyleUrl.startsWith('http')) {
                      const updated = [...styleReferenceUrls, newStyleUrl]
                      onStyleReferenceUrlsChange(updated)
                      onNewStyleUrlChange('')
                      onSaveStyleSettings(SettingsStyleMode.Custom, null, updated)
                    }
                  }}
                  disabled={!newStyleUrl || !newStyleUrl.startsWith('http')}
                >
                  Add URL
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
)
