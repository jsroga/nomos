import React, { useState, useEffect } from 'react'
import { aiService } from '@/lib/ai/service'
import { X } from 'lucide-react'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const [activeId, setActiveId] = useState(aiService.getActiveModelId())
  const [config, setConfig] = useState<any>({})
  const models = aiService.getAvailableModels()

  useEffect(() => {
    if (isOpen) {
      setActiveId(aiService.getActiveModelId())
      setConfig(aiService.getConfig(aiService.getActiveModelId()))
    }
  }, [isOpen])

  const handleSave = () => {
    aiService.setActiveModel(activeId)
    aiService.updateConfig(activeId, config)
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
      <div className="w-full max-w-md bg-card border border-border rounded-lg shadow-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-xl font-bold mb-4">Settings</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">AI Provider</label>
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
                  {activeId === 'stability' && (
                    <a
                      href="https://platform.stability.ai/account/keys"
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
          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
