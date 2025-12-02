/* eslint-disable */
import React, { useState, useEffect } from 'react'
import { aiService } from '@/infrastructure/ai/service'
import { X, Settings, Image as ImageIcon, Key, ScanLine, Box } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

type Tab = 'general' | 'upscaling' | 'apikeys'

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('general')
  
  const [activeId, setActiveId] = useState(aiService.getActiveModelId())
  const [config, setConfig] = useState<any>({})
  const [nanoConfig, setNanoConfig] = useState<any>({})
  const [upscale4kConfig, setUpscale4kConfig] = useState<any>({})
  const [replicateConfig, setReplicateConfig] = useState<any>({})
  const [falConfig, setFalConfig] = useState<any>({})
  const [hyper3dConfig, setHyper3dConfig] = useState<any>({})
  const [meshyConfig, setMeshyConfig] = useState<any>({})
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

      const savedFal = localStorage.getItem('ai-config-fal')
      if (savedFal) setFalConfig(JSON.parse(savedFal))

      const savedHyper3d = localStorage.getItem('ai-config-hyper3d')
      if (savedHyper3d) setHyper3dConfig(JSON.parse(savedHyper3d))

      const savedMeshy = localStorage.getItem('ai-config-meshy')
      if (savedMeshy) setMeshyConfig(JSON.parse(savedMeshy))

      const savedUpscaler = localStorage.getItem('ai-active-upscaler')
      if (savedUpscaler) setActiveUpscaler(savedUpscaler)
    }
  }, [isOpen])

  const handleSave = () => {
    aiService.setActiveModel(activeId)
    aiService.updateConfig(activeId, config)

    // Save configs
    localStorage.setItem('ai-config-nano-banana', JSON.stringify(nanoConfig))
    localStorage.setItem('ai-config-stability', JSON.stringify(upscale4kConfig))
    localStorage.setItem('ai-config-replicate', JSON.stringify(replicateConfig))
    localStorage.setItem('ai-config-fal', JSON.stringify(falConfig))
    localStorage.setItem('ai-config-hyper3d', JSON.stringify(hyper3dConfig))
    localStorage.setItem('ai-config-meshy', JSON.stringify(meshyConfig))
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

  const selectedModel = models.find(m => m.id === activeId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[600px] bg-card border border-border rounded-lg shadow-lg flex overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Sidebar */}
        <div className="w-[200px] bg-muted/30 border-r border-border flex flex-col p-4">
          <h2 className="text-lg font-bold mb-6 px-2">Settings</h2>
          <nav className="space-y-2 flex-1">
            <Button
              variant={activeTab === 'general' ? 'secondary' : 'ghost'}
              className="w-full justify-start gap-2"
              onClick={() => setActiveTab('general')}
            >
              <Settings className="w-4 h-4" />
              General
            </Button>
            <Button
              variant={activeTab === 'upscaling' ? 'secondary' : 'ghost'}
              className="w-full justify-start gap-2"
              onClick={() => setActiveTab('upscaling')}
            >
              <ImageIcon className="w-4 h-4" />
              Upscaling
            </Button>
            <Button
              variant={activeTab === 'apikeys' ? 'secondary' : 'ghost'}
              className="w-full justify-start gap-2"
              onClick={() => setActiveTab('apikeys')}
            >
              <Key className="w-4 h-4" />
              API Keys
            </Button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <ScrollArea className="flex-1 p-6">
            <div className="max-w-2xl mx-auto space-y-8 pb-20">
              
              {/* General Tab */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Generation Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1.5">AI Provider</label>
                        <select
                          value={activeId}
                          onChange={e => handleModelChange(e.target.value)}
                          className="w-full p-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
                        >
                          {models.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {selectedModel?.description}
                        </p>
                      </div>

                      {activeId === 'custom' && (
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Base URL</label>
                          <input
                            type="text"
                            value={config.baseUrl || ''}
                            onChange={e => handleConfigChange({ baseUrl: e.target.value })}
                            placeholder="https://..."
                            className="w-full p-2 rounded-md border border-input bg-background text-sm"
                          />
                        </div>
                      )}

                      {activeId === 'gemini' && (
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Model ID</label>
                          <input
                            type="text"
                            value={config.params?.modelId || 'imagen-3.0-generate-001'}
                            onChange={e => handleParamChange('modelId', e.target.value)}
                            placeholder="imagen-3.0-generate-001"
                            className="w-full p-2 rounded-md border border-input bg-background text-sm"
                          />
                          <p className="text-xs text-muted-foreground mt-1.5">
                            Try <code>imagen-3.0-generate-001</code> or <code>gemini-1.5-pro</code>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {(activeId === 'stability' || activeId === 'custom') && (
                    <div className="border-t border-border pt-6">
                      <h3 className="text-lg font-medium mb-4">Parameters</h3>
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <label className="text-sm font-medium">Steps</label>
                            <span className="text-sm text-muted-foreground">{config.params?.steps || 30}</span>
                          </div>
                          <Slider
                            min={10}
                            max={150}
                            step={1}
                            value={[config.params?.steps || 30]}
                            onValueChange={([val]) => handleParamChange('steps', val)}
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <label className="text-sm font-medium">CFG Scale</label>
                            <span className="text-sm text-muted-foreground">{config.params?.cfgScale || 7}</span>
                          </div>
                          <Slider
                            min={1}
                            max={30}
                            step={0.5}
                            value={[config.params?.cfgScale || 7]}
                            onValueChange={([val]) => handleParamChange('cfgScale', val)}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1.5">Sampler</label>
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
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Upscaling & Tools Tab */}
              {activeTab === 'upscaling' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Upscaler Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Upscaler Provider</label>
                        <select
                          value={activeUpscaler}
                          onChange={e => setActiveUpscaler(e.target.value)}
                          className="w-full p-2 rounded-md border border-input bg-background text-sm"
                        >
                          <option value="stability">Stability AI (4k)</option>
                          <option value="replicate">Replicate (Creative/Painterly)</option>
                        </select>
                      </div>

                      {activeUpscaler === 'stability' && (
                        <div className="bg-muted/50 p-4 rounded-md space-y-4 border border-border">
                          <h4 className="text-sm font-semibold">Stability AI Configuration</h4>
                          <div>
                            <label className="block text-sm font-medium mb-1.5">Upscale Mode</label>
                            <select
                              value={(upscale4kConfig as any).upscaleMode || 'conservative'}
                              onChange={e => setUpscale4kConfig({ ...upscale4kConfig, upscaleMode: e.target.value })}
                              className="w-full p-2 rounded-md border border-input bg-background text-sm"
                            >
                              <option value="conservative">Conservative (Fast, maintains style)</option>
                              <option value="creative">Creative (Slow, adds details)</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {activeUpscaler === 'replicate' && (
                        <div className="bg-muted/50 p-4 rounded-md space-y-4 border border-border">
                          <h4 className="text-sm font-semibold">Replicate Configuration</h4>
                          <div>
                            <label className="block text-sm font-medium mb-1.5">Model ID</label>
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
                  </div>

                  <div className="border-t border-border pt-6">
                    <h3 className="text-lg font-medium mb-4">Tool Settings</h3>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-semibold mb-3">Nano Banana Pro (Initial Generation)</h4>
                        <div className="space-y-3">
                          <label className="block text-sm font-medium mb-1.5">Model Override (Optional)</label>
                          <input
                            type="text"
                            value={nanoConfig.model || ''}
                            onChange={e => setNanoConfig({ ...nanoConfig, model: e.target.value })}
                            placeholder="gemini-3-pro-image-preview"
                            className="w-full p-2 rounded-md border border-input bg-background text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <ScanLine className="w-4 h-4" />
                          Smart Select (SAM-3)
                        </h4>
                        <div className="bg-muted/50 p-4 rounded-md border border-border space-y-4">
                          <p className="text-xs text-muted-foreground">
                            Configure Fal.ai SAM-3 segmentation parameters. API Key is set in the API Keys tab.
                          </p>
                          
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <label className="text-sm font-medium">Multimask Output</label>
                              <input
                                type="checkbox"
                                checked={falConfig.returnMultipleMasks || false}
                                onChange={e => setFalConfig({ ...falConfig, returnMultipleMasks: e.target.checked })}
                                className="rounded border-input"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">Return multiple mask options to choose from</p>
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <label className="text-sm font-medium">Include Scores</label>
                              <input
                                type="checkbox"
                                checked={falConfig.includeScores !== false}
                                onChange={e => setFalConfig({ ...falConfig, includeScores: e.target.checked })}
                                className="rounded border-input"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">Include confidence scores in response</p>
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <label className="text-sm font-medium">Include Boxes</label>
                              <input
                                type="checkbox"
                                checked={falConfig.includeBoxes !== false}
                                onChange={e => setFalConfig({ ...falConfig, includeBoxes: e.target.checked })}
                                className="rounded border-input"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">Include bounding boxes in response</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* API Keys Tab */}
              {activeTab === 'apikeys' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Centralized API Keys</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Manage your API keys for all services here. Keys are stored locally in your browser.
                    </p>
                    
                    <div className="space-y-6">
                      {/* Active Generation Provider Key */}
                      {activeId !== 'mock' && (
                        <div className="space-y-3 p-4 border border-primary/20 bg-primary/5 rounded-md">
                          <div className="flex justify-between items-center">
                            <label className="block text-sm font-medium text-primary">
                              Generation: {selectedModel?.name} Key
                            </label>
                            {activeId === 'openai' && (
                              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Get Key</a>
                            )}
                            {activeId === 'gemini' && (
                              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Get Key</a>
                            )}
                          </div>
                          <input
                            type="password"
                            value={config.apiKey || ''}
                            onChange={e => handleConfigChange({ apiKey: e.target.value })}
                            placeholder={`Enter ${selectedModel?.name} API Key`}
                            className="w-full p-2 rounded-md border border-input bg-background text-sm"
                          />
                        </div>
                      )}

                      {/* Nano Banana Key */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">Nano Banana Key</label>
                        <input
                          type="password"
                          value={nanoConfig.apiKey || ''}
                          onChange={e => setNanoConfig({ ...nanoConfig, apiKey: e.target.value })}
                          placeholder="nb-..."
                          className="w-full p-2 rounded-md border border-input bg-background text-sm"
                        />
                      </div>

                      {/* Fal.ai Key */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="block text-sm font-medium">Fal.ai Key (Segmentation)</label>
                          <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Get Key</a>
                        </div>
                        <input
                          type="password"
                          value={falConfig.apiKey || ''}
                          onChange={e => setFalConfig({ ...falConfig, apiKey: e.target.value })}
                          placeholder="Enter your fal.ai API key"
                          className="w-full p-2 rounded-md border border-input bg-background text-sm"
                        />
                      </div>

                      {/* Stability Key */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">Stability AI Key (Upscaling)</label>
                        <input
                          type="password"
                          value={upscale4kConfig.apiKey || ''}
                          onChange={e => setUpscale4kConfig({ ...upscale4kConfig, apiKey: e.target.value })}
                          placeholder="sk-..."
                          className="w-full p-2 rounded-md border border-input bg-background text-sm"
                        />
                      </div>

                      {/* Replicate Key */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">Replicate Key (Upscaling)</label>
                        <input
                          type="password"
                          value={replicateConfig.apiKey || ''}
                          onChange={e => setReplicateConfig({ ...replicateConfig, apiKey: e.target.value })}
                          placeholder="r8_..."
                          className="w-full p-2 rounded-md border border-input bg-background text-sm"
                        />
                      </div>

                      <div className="pt-4 border-t border-border">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Box className="w-4 h-4" />
                            3D Generators
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                           {/* Hyper3D Key */}
                           <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                <label className="block text-sm font-medium">Hyper3D Key</label>
                                <a href="https://developer.hyper3d.ai/" target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Get Key</a>
                                </div>
                                <input
                                type="password"
                                value={hyper3dConfig.apiKey || ''}
                                onChange={e => setHyper3dConfig({ ...hyper3dConfig, apiKey: e.target.value })}
                                placeholder="Enter Hyper3D API Key"
                                className="w-full p-2 rounded-md border border-input bg-background text-sm"
                                />
                            </div>

                            {/* Meshy Key */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                <label className="block text-sm font-medium">Meshy Key</label>
                                <a href="https://www.meshy.ai/api" target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Get Key</a>
                                </div>
                                <input
                                type="password"
                                value={meshyConfig.apiKey || ''}
                                onChange={e => setMeshyConfig({ ...meshyConfig, apiKey: e.target.value })}
                                placeholder="Enter Meshy API Key"
                                className="w-full p-2 rounded-md border border-input bg-background text-sm"
                                />
                            </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-card flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
