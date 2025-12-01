/* eslint-disable */
import React, { useState, useEffect } from 'react'
import { aiService } from '@/infrastructure/ai/service'
import { X } from 'lucide-react'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const [activeId, setActiveId] = useState(aiService.getActiveModelId())
  const [config, setConfig] = useState<any>({})
  const [nanoConfig, setNanoConfig] = useState<any>({})
  const [upscale4kConfig, setUpscale4kConfig] = useState<any>({})
  const [replicateConfig, setReplicateConfig] = useState<any>({})
  const [activeUpscaler, setActiveUpscaler] = useState<string>('stability')
  const models = aiService.getAvailableModels()

  useEffect(() => {
    if (isOpen) {
      setActiveId(aiService.getActiveModelId())
      setConfig(aiService.getConfig(aiService.getActiveModelId()))

      // Load configs
      const savedNano = localStorage.getItem('ai-config-nano-banana')
      if (savedNano) setNanoConfig(JSON.parse(savedNano))

      const saved4k = localStorage.getItem('ai-config-stability')
      if (saved4k) setUpscale4kConfig(JSON.parse(saved4k))

      const savedReplicate = localStorage.getItem('ai-config-replicate')
      if (savedReplicate) setReplicateConfig(JSON.parse(savedReplicate))

      const savedUpscaler = localStorage.getItem('ai-active-upscaler')
      if (savedUpscaler) setActiveUpscaler(savedUpscaler)
    }
  }, [isOpen])

  const handleSave = () => {
    aiService.setActiveModel(activeId)
    aiService.updateConfig(activeId, config)

    // Save configs
    // Save configs
    localStorage.setItem('ai-config-nano-banana', JSON.stringify(nanoConfig))
    // We save the 4k config as 'ai-config-stability' because that's what StabilityAIModel looks for in upscale4k
    localStorage.setItem('ai-config-stability', JSON.stringify(upscale4kConfig))
    localStorage.setItem('ai-config-replicate', JSON.stringify(replicateConfig))
    localStorage.setItem('ai-active-upscaler', activeUpscaler)

    onClose()
  }

  const handleModelChange = (id: string) => {
    setActiveId(id)
    setConfig(aiService.getConfig(id))
  }

  const handleConfigChange = (update: any) => {
    setConfig((prev: any) => ({ ...prev, ...update }))
  }

  const handleParamChange = (key: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      params: { ...prev.params, [key]: value },
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-lg shadow-lg p-6 relative max-h-[80vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-xl font-bold mb-4">Settings</h2>

        <div className="space-y-6">
          {/* Generation Provider Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Generation Provider</h3>
            <div>
              <label className="block text-sm font-medium mb-1">AI Provider for Generation</label>
              <select
                value={activeId}
                onChange={e => handleModelChange(e.target.value)}
                className="w-full p-2 rounded-md border border-input bg-background text-sm"
              >
                {models.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                {models.find(m => m.id === activeId)?.description}
              </p>
            </div>

            {activeId !== 'mock' && (
              <div className="space-y-4">
                {activeId === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Base URL</label>
                    <input
                      type="text"
                      value={config.baseUrl || ''}
                      onChange={e => handleConfigChange({ baseUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full p-2 rounded-md border border-input bg-background text-sm"
                    />
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium">API Key</label>
                    {activeId === 'openai' && (
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Get Key
                      </a>
                    )}
                    {activeId === 'gemini' && (
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Get Key
                      </a>
                    )}
                  </div>
                  <input
                    type="password"
                    value={config.apiKey || ''}
                    onChange={e => handleConfigChange({ apiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full p-2 rounded-md border border-input bg-background text-sm"
                  />
                </div>

                {activeId === 'gemini' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Model ID</label>
                    <input
                      type="text"
                      value={config.params?.modelId || 'imagen-3.0-generate-001'}
                      onChange={e => handleParamChange('modelId', e.target.value)}
                      placeholder="imagen-3.0-generate-001"
                      className="w-full p-2 rounded-md border border-input bg-background text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Try <code>imagen-3.0-generate-001</code> or <code>gemini-1.5-pro</code>
                    </p>
                  </div>
                )}

                {(activeId === 'stability' || activeId === 'custom') && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Steps ({config.params?.steps || 30})
                        </label>
                        <input
                          type="range"
                          min="10"
                          max="150"
                          value={config.params?.steps || 30}
                          onChange={e => handleParamChange('steps', parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          CFG Scale ({config.params?.cfgScale || 7})
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="30"
                          step="0.5"
                          value={config.params?.cfgScale || 7}
                          onChange={e => handleParamChange('cfgScale', parseFloat(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Sampler</label>
                      <select
                        value={config.params?.sampler || 'Euler a'}
                        onChange={e => handleParamChange('sampler', e.target.value)}
                        className="w-full p-2 rounded-md border border-input bg-background text-sm"
                      >
                        <option value="Euler a">Euler a</option>
                        <option value="Euler">Euler</option>
                        <option value="LMS">LMS</option>
                        <option value="Heun">Heun</option>
                        <option value="DPM2">DPM2</option>
                        <option value="DPM2 a">DPM2 a</option>
                        <option value="DPM++ 2S a">DPM++ 2S a</option>
                        <option value="DPM++ 2M">DPM++ 2M</option>
                        <option value="DPM++ SDE">DPM++ SDE</option>
                        <option value="DPM fast">DPM fast</option>
                        <option value="DPM adaptive">DPM adaptive</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Upscaling & Repaint Providers Section */}
          <div className="space-y-4 border-t border-border pt-4">
            <h3 className="text-lg font-semibold">Upscale & Repaint Providers</h3>

            {/* Nano Banana Pro */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Nano Banana Pro (Step 1 & Repaint)</h4>
              <div>
                <label className="block text-xs font-medium mb-1">API Key</label>
                <input
                  type="password"
                  value={nanoConfig.apiKey || ''}
                  onChange={e => setNanoConfig({ ...nanoConfig, apiKey: e.target.value })}
                  placeholder="nb-..."
                  className="w-full p-2 rounded-md border border-input bg-background text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Model (Optional)</label>
                <input
                  type="text"
                  value={nanoConfig.model || ''}
                  onChange={e => setNanoConfig({ ...nanoConfig, model: e.target.value })}
                  placeholder="gemini-3-pro-image-preview"
                  className="w-full p-2 rounded-md border border-input bg-background text-sm"
                />
              </div>
            </div>

          </div>

          {/* Upscaler Provider Selection */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <h4 className="text-sm font-medium">Step 2: High-Res Upscaler</h4>
            <select
              value={activeUpscaler}
              onChange={e => setActiveUpscaler(e.target.value)}
              className="w-full p-2 rounded-md border border-input bg-background text-sm"
            >
              <option value="stability">Stability AI (4k)</option>
              <option value="replicate">Replicate (Creative/Painterly)</option>
            </select>
          </div>

          {/* Stability AI Settings */}
          {activeUpscaler === 'stability' && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <h4 className="text-sm font-medium">Stability AI Settings</h4>
              <p className="text-xs text-muted-foreground">
                Uses Stability AI's upscaling model (e.g. esrgan-v1-x2plus).
              </p>
              <div>
                <label className="block text-xs font-medium mb-1">Stability API Key</label>
                <input
                  type="password"
                  value={upscale4kConfig.apiKey || ''}
                  onChange={e => setUpscale4kConfig({ ...upscale4kConfig, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full p-2 rounded-md border border-input bg-background text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Upscale Mode</label>
                <select
                  value={(upscale4kConfig as { apiKey?: string, upscaleMode?: string }).upscaleMode || 'conservative'}
                  onChange={e => setUpscale4kConfig({ ...upscale4kConfig, upscaleMode: e.target.value })}
                  className="w-full p-2 rounded-md border border-input bg-background text-sm"
                >
                  <option value="conservative">Conservative (Fast, maintains style)</option>
                  <option value="creative">Creative (Slow, adds details)</option>
                </select>
              </div>
            </div>
          )}

          {/* Replicate Settings */}
          {activeUpscaler === 'replicate' && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <h4 className="text-sm font-medium">Replicate Settings</h4>
              <p className="text-xs text-muted-foreground">
                Uses Replicate models for creative upscaling. Default: <code>recraft-ai/recraft-creative-upscale</code>
              </p>
              <div>
                <label className="block text-xs font-medium mb-1">Replicate API Key</label>
                <input
                  type="password"
                  value={replicateConfig.apiKey || ''}
                  onChange={e => setReplicateConfig({ ...replicateConfig, apiKey: e.target.value })}
                  placeholder="r8_..."
                  className="w-full p-2 rounded-md border border-input bg-background text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Model ID</label>
                <input
                  type="text"
                  value={replicateConfig.model || 'recraft-ai/recraft-creative-upscale'}
                  onChange={e => setReplicateConfig({ ...replicateConfig, model: e.target.value })}
                  placeholder="recraft-ai/recraft-creative-upscale"
                  className="w-full p-2 rounded-md border border-input bg-background text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-md border border-border hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Save
          </button>
        </div>
      </div>
    </div>

  )
}
