/* eslint-disable */
import React, { useState, useEffect } from 'react'
import { aiService } from '@/infrastructure/ai/service'
import {
  X,
  Settings,
  Image as ImageIcon,
  Box,
  Brain,
  Key,
  Info,
  ScanLine,
  Check,
  Wrench,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
  projectId?: string // Optional: for project-specific settings
}

type Tab = 'generation' | 'upscaling' | 'tools' | 'apikeys' | 'storyteller' | 'projectSettings'

import { LocalStorageKeys } from '@/constants/localStorage'

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose, projectId }) => {
  const [activeTab, setActiveTab] = useState<Tab>('generation')

  const [activeId, setActiveId] = useState(aiService.getActiveModelId())
  const [config, setConfig] = useState<any>({})
  const [openaiConfig, setOpenaiConfig] = useState<any>({})
  const [geminiConfig, setGeminiConfig] = useState<any>({})
  const [upscale4kConfig, setUpscale4kConfig] = useState<any>({})
  const [replicateConfig, setReplicateConfig] = useState<any>({})
  const [falConfig, setFalConfig] = useState<any>({})
  const [hyper3dConfig, setHyper3dConfig] = useState<any>({})
  const [meshyConfig, setMeshyConfig] = useState<any>({})
  const [cometConfig, setCometConfig] = useState<any>({})
  const [activeUpscaler, setActiveUpscaler] = useState<string>('stability')
  const [skipGeminiPreUpscale, setSkipGeminiPreUpscale] = useState(false)

  // Storyteller AI Settings
  const [storytellerProvider, setStorytellerProvider] = useState<'openai' | 'anthropic' | 'gemini'>('openai')
  const [anthropicApiKey, setAnthropicApiKey] = useState<string>('')

  // Fidelity Enhancement Settings
  const [defaultFidelityPrompt, setDefaultFidelityPrompt] = useState<string>('')

  // Project Settings
  const [projectData, setProjectData] = useState<any>(null)
  const [styleReferenceUrls, setStyleReferenceUrls] = useState<string[]>([])
  const [newStyleUrl, setNewStyleUrl] = useState<string>('')

  const models = aiService.getAvailableModels()

  useEffect(() => {
    if (isOpen) {
      setActiveId(aiService.getActiveModelId())
      setConfig(aiService.getConfig(aiService.getActiveModelId()))

      // Load configs
      const savedOpenai = localStorage.getItem(LocalStorageKeys.AI_CONFIG_OPENAI)
      if (savedOpenai) setOpenaiConfig(JSON.parse(savedOpenai))

      const savedGemini = localStorage.getItem(LocalStorageKeys.AI_CONFIG_GEMINI)
      if (savedGemini) setGeminiConfig(JSON.parse(savedGemini))

      const saved4k = localStorage.getItem(LocalStorageKeys.AI_CONFIG_STABILITY)
      if (saved4k) setUpscale4kConfig(JSON.parse(saved4k))

      const savedReplicate = localStorage.getItem(LocalStorageKeys.AI_CONFIG_REPLICATE)
      if (savedReplicate) setReplicateConfig(JSON.parse(savedReplicate))

      const savedFal = localStorage.getItem(LocalStorageKeys.AI_CONFIG_FAL)
      if (savedFal) setFalConfig(JSON.parse(savedFal))

      const savedHyper3d = localStorage.getItem(LocalStorageKeys.AI_CONFIG_HYPER3D)
      if (savedHyper3d) setHyper3dConfig(JSON.parse(savedHyper3d))

      const savedMeshy = localStorage.getItem(LocalStorageKeys.AI_CONFIG_MESHY)
      if (savedMeshy) setMeshyConfig(JSON.parse(savedMeshy))

      const savedComet = localStorage.getItem(LocalStorageKeys.AI_CONFIG_COMET)
      if (savedComet) setCometConfig(JSON.parse(savedComet))

      const savedUpscaler = localStorage.getItem(LocalStorageKeys.AI_ACTIVE_UPSCALER)
      if (savedUpscaler) setActiveUpscaler(savedUpscaler)

      const savedSkipGemini = localStorage.getItem(LocalStorageKeys.SKIP_GEMINI_PRE_UPSCALE)
      setSkipGeminiPreUpscale(savedSkipGemini === 'true')

      // Load Fidelity prompt
      const savedFidelityPrompt = localStorage.getItem(LocalStorageKeys.FIDELITY_PROMPT)
      setDefaultFidelityPrompt(savedFidelityPrompt || 'Enhance with fine artistic details, crisp textures, and vibrant colors while maintaining the original composition.')

      // Load Storyteller settings
      const savedProvider = localStorage.getItem(LocalStorageKeys.PREFERRED_MODEL_PROVIDER)
      if (savedProvider === 'anthropic' || savedProvider === 'openai') {
        setStorytellerProvider(savedProvider)
      }
      const savedAnthropicKey = localStorage.getItem(LocalStorageKeys.ANTHROPIC_API_KEY)
      if (savedAnthropicKey) setAnthropicApiKey(savedAnthropicKey)

      // Load project settings if projectId provided
      if (projectId) {
        fetch(`/ api / storyteller / projects / ${projectId} `)
          .then(res => res.json())
          .then(data => {
            setProjectData(data)
            setStyleReferenceUrls(data.style_reference_urls || [])
          })
          .catch(err => console.error('Failed to load project:', err))
      }
    }
  }, [isOpen, projectId])

  const handleSave = () => {
    aiService.setActiveModel(activeId)
    aiService.updateConfig(activeId, config)

    // Save configs
    localStorage.setItem(LocalStorageKeys.AI_CONFIG_OPENAI, JSON.stringify(openaiConfig))
    localStorage.setItem(LocalStorageKeys.AI_CONFIG_GEMINI, JSON.stringify(geminiConfig))
    localStorage.setItem(LocalStorageKeys.AI_CONFIG_NANO_BANANA, JSON.stringify(geminiConfig)) // Gemini = Nano Banana
    localStorage.setItem(LocalStorageKeys.AI_CONFIG_STABILITY, JSON.stringify(upscale4kConfig))
    localStorage.setItem(LocalStorageKeys.AI_CONFIG_REPLICATE, JSON.stringify(replicateConfig))
    localStorage.setItem(LocalStorageKeys.AI_CONFIG_FAL, JSON.stringify(falConfig))
    localStorage.setItem(LocalStorageKeys.AI_CONFIG_HYPER3D, JSON.stringify(hyper3dConfig))
    localStorage.setItem(LocalStorageKeys.AI_CONFIG_MESHY, JSON.stringify(meshyConfig))
    localStorage.setItem(LocalStorageKeys.AI_CONFIG_COMET, JSON.stringify(cometConfig))
    localStorage.setItem(LocalStorageKeys.AI_ACTIVE_UPSCALER, activeUpscaler)
    localStorage.setItem(LocalStorageKeys.SKIP_GEMINI_PRE_UPSCALE, skipGeminiPreUpscale.toString())
    localStorage.setItem(LocalStorageKeys.FIDELITY_PROMPT, defaultFidelityPrompt)

    // Save Storyteller settings
    localStorage.setItem(LocalStorageKeys.PREFERRED_MODEL_PROVIDER, storytellerProvider)
    if (anthropicApiKey) {
      localStorage.setItem(LocalStorageKeys.ANTHROPIC_API_KEY, anthropicApiKey)
    }

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

  // Connection status indicator component
  const ConnectionStatus = ({
    isConnected,
    label,
  }: {
    isConnected: boolean
    label: string
  }) => (
    <div className="flex items-center gap-2 text-xs bg-muted/30 p-2 rounded border border-border w-fit">
      <div
        className={
          isConnected
            ? 'w-2 h-2 bg-green-500 rounded-full'
            : 'w-2 h-2 bg-red-500 rounded-full'
        }
      />
      <span className="text-muted-foreground">
        {isConnected ? `${label} Connected` : `${label} Not Connected`}
      </span>
    </div>
  )

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
              variant={activeTab === 'generation' ? 'secondary' : 'ghost'}
              className="w-full justify-start gap-2"
              onClick={() => setActiveTab('generation')}
            >
              <Sparkles className="w-4 h-4" />
              Generation
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
              variant={activeTab === 'tools' ? 'secondary' : 'ghost'}
              className="w-full justify-start gap-2"
              onClick={() => setActiveTab('tools')}
            >
              <Wrench className="w-4 h-4" />
              Editor Tools
            </Button>
            <Button
              variant={activeTab === 'apikeys' ? 'secondary' : 'ghost'}
              className="w-full justify-start gap-2"
              onClick={() => setActiveTab('apikeys')}
            >
              <Key className="w-4 h-4" />
              API Keys
            </Button>
            <Button
              variant={activeTab === 'storyteller' ? 'secondary' : 'ghost'}
              className="w-full justify-start gap-2"
              onClick={() => setActiveTab('storyteller')}
            >
              <Brain className="w-4 h-4" />
              Writers Room AI
            </Button>
            {projectId && (
              <Button
                variant={activeTab === 'projectSettings' ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-2"
                onClick={() => setActiveTab('projectSettings')}
              >
                <Settings className="w-4 h-4" />
                Project Settings
              </Button>
            )}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <ScrollArea className="flex-1 p-6">
            <div className="max-w-2xl mx-auto space-y-8 pb-20">
              {/* Generation Tab */}
              {activeTab === 'generation' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">World Generation</h3>

                    <div className="space-y-6">
                      {/* Card: Tile Generation */}
                      <div className="p-4 rounded-lg bg-card border border-border space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <h4 className="font-semibold text-sm">Tile Generator</h4>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1.5">Primary Model</label>
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

                        {activeId === 'midjourney' && (
                          <div className="space-y-3">
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3">
                              <p className="text-xs text-blue-600 dark:text-blue-400">
                                Midjourney uses the Comet API for tile generation.
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs bg-muted/30 p-2 rounded border border-border">
                              <div
                                className={
                                  config.apiKey || cometConfig.apiKey
                                    ? 'w-2 h-2 bg-green-500 rounded-full'
                                    : 'w-2 h-2 bg-red-500 rounded-full'
                                }
                              />
                              <span className="text-muted-foreground">
                                {config.apiKey || cometConfig.apiKey
                                  ? 'Comet API Key Configured'
                                  : 'Missing Comet API Key'}
                              </span>
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 ml-auto text-xs"
                                onClick={() => setActiveTab('apikeys')}
                              >
                                Configure in API Keys
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Fidelity Enhancement (Inside Tile Generator) */}
                        <div className="pt-4 border-t border-border/50">
                          <label className="block text-sm font-medium mb-1.5">
                            Fidelity Enhancement Prompt
                          </label>
                          <textarea
                            value={defaultFidelityPrompt}
                            onChange={e => setDefaultFidelityPrompt(e.target.value)}
                            placeholder="Describe the artistic style to apply..."
                            className="w-full p-2 rounded-md border border-input bg-background text-sm h-20 resize-none"
                          />
                          <p className="text-xs text-muted-foreground mt-1.5">
                            Appended to prompts when enhancing tile fidelity.
                          </p>
                        </div>
                      </div>

                      {/* Card: Parameters (Only for Stability/Custom) */}
                      {(activeId === 'stability' || activeId === 'custom') && (
                        <div className="p-4 rounded-lg bg-card border border-border space-y-4">
                          <h4 className="font-semibold text-sm mb-2">Generation Parameters</h4>
                          <div className="space-y-6">
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <label className="text-sm font-medium">Steps</label>
                                <span className="text-sm text-muted-foreground">
                                  {config.params?.steps || 30}
                                </span>
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
                                <span className="text-sm text-muted-foreground">
                                  {config.params?.cfgScale || 7}
                                </span>
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



                      {/* Card: API Connections Summary */}
                      <div className="p-4 rounded-lg bg-card border border-border space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Key className="w-4 h-4 text-primary" />
                          <h4 className="font-semibold text-sm">API Connections</h4>
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 ml-auto text-xs"
                            onClick={() => setActiveTab('apikeys')}
                          >
                            Manage Keys
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {/* Image Generation */}
                          <div className="space-y-2">
                            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Image Generation</h5>
                            <ConnectionStatus isConnected={!!geminiConfig.apiKey} label="Gemini (Imagen)" />
                            <ConnectionStatus isConnected={!!cometConfig.apiKey} label="Midjourney (Comet)" />
                          </div>

                          {/* Upscaling */}
                          <div className="space-y-2">
                            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Upscaling</h5>
                            <ConnectionStatus isConnected={!!upscale4kConfig.apiKey} label="Stability AI" />
                            <ConnectionStatus isConnected={!!replicateConfig.apiKey} label="Replicate" />
                          </div>

                          {/* 3D Generation */}
                          <div className="space-y-2">
                            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">3D Generation</h5>
                            <ConnectionStatus isConnected={!!hyper3dConfig.apiKey} label="Hyper3D" />
                            <ConnectionStatus isConnected={!!meshyConfig.apiKey} label="Meshy" />
                          </div>

                          {/* Tools & AI */}
                          <div className="space-y-2">
                            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tools & AI</h5>
                            <ConnectionStatus isConnected={!!openaiConfig.apiKey} label="OpenAI" />
                            <ConnectionStatus isConnected={!!anthropicApiKey} label="Anthropic (Claude)" />
                            <ConnectionStatus isConnected={!!falConfig.apiKey} label="Fal.ai (Smart Select)" />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* Upscaling Tab */}
              {activeTab === 'upscaling' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Image Upscaling</h3>

                    <div className="p-4 rounded-lg bg-card border border-border space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ImageIcon className="w-4 h-4 text-primary" />
                        <h4 className="font-semibold text-sm">Upscaler Configuration</h4>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1.5">
                            Upscaler Provider
                          </label>
                          <select
                            value={activeUpscaler}
                            onChange={e => setActiveUpscaler(e.target.value)}
                            className="w-full p-2 rounded-md border border-input bg-background text-sm"
                          >
                            <option value="stability">Stability AI (4k)</option>
                            <option value="replicate">Replicate (Creative/Painterly)</option>
                            <option value="midjourney">Midjourney (Comet API)</option>
                          </select>
                        </div>

                        {/* Gemini Pre-Upscale Toggle */}
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md border border-border">
                          <div>
                            <label className="text-sm font-medium">Gemini Pre-Upscale</label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Enhance image with Gemini before provider upscale
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSkipGeminiPreUpscale(!skipGeminiPreUpscale)}
                            className={`relative w - 11 h - 6 rounded - full transition - colors ${!skipGeminiPreUpscale ? 'bg-primary' : 'bg-muted-foreground/30'
                              } `}
                          >
                            <span
                              className={`absolute top - 0.5 left - 0.5 w - 5 h - 5 bg - white rounded - full shadow transition - transform ${!skipGeminiPreUpscale ? 'translate-x-5' : 'translate-x-0'
                                } `}
                            />
                          </button>
                        </div>

                        {activeUpscaler === 'stability' && (
                          <div className="bg-muted/30 p-4 rounded-md space-y-4 border border-border">
                            <h4 className="text-sm font-semibold">Stability AI Configuration</h4>
                            <div>
                              <label className="block text-sm font-medium mb-1.5">Upscale Mode</label>
                              <select
                                value={(upscale4kConfig as any).upscaleMode || 'conservative'}
                                onChange={e =>
                                  setUpscale4kConfig({
                                    ...upscale4kConfig,
                                    upscaleMode: e.target.value,
                                  })
                                }
                                className="w-full p-2 rounded-md border border-input bg-background text-sm"
                              >
                                <option value="conservative">
                                  Conservative (Fast, maintains style)
                                </option>
                                <option value="creative">Creative (Slow, adds details)</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {activeUpscaler === 'replicate' && (
                          <div className="bg-muted/30 p-4 rounded-md space-y-4 border border-border">
                            <h4 className="text-sm font-semibold">Replicate Configuration</h4>
                            <div>
                              <label className="block text-sm font-medium mb-1.5">Model ID</label>
                              <input
                                type="text"
                                value={replicateConfig.model || 'recraft-ai/recraft-creative-upscale'}
                                onChange={e =>
                                  setReplicateConfig({ ...replicateConfig, model: e.target.value })
                                }
                                placeholder="recraft-ai/recraft-creative-upscale"
                                className="w-full p-2 rounded-md border border-input bg-background text-sm"
                              />
                            </div>
                          </div>
                        )}

                        {activeUpscaler === 'midjourney' && (
                          <div className="bg-muted/30 p-4 rounded-md space-y-4 border border-border">
                            <div className="flex justify-between items-center">
                              <h4 className="text-sm font-semibold">Midjourney Configuration</h4>
                              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setActiveTab('apikeys')}>
                                Configure API Key
                              </Button>
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1.5">Additional Parameters</label>
                              <input
                                type="text"
                                value={cometConfig.parameters || ''}
                                onChange={e => setCometConfig({ ...cometConfig, parameters: e.target.value })}
                                placeholder="--style raw --stylize 100 --cref https://..."
                                className="w-full p-2 rounded-md border border-input bg-background text-sm font-mono"
                              />
                              <p className="text-xs text-muted-foreground mt-1.5">
                                Appended to the upscale prompt. Supports standard Discord parameters.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tools Tab */}
              {activeTab === 'tools' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Editor Tools</h3>

                    <div className="p-4 rounded-lg bg-card border border-border space-y-4">
                      <div className="flex items-center gap-2">
                        <ScanLine className="w-4 h-4 text-primary" />
                        <h4 className="font-semibold text-sm">Smart Select (SAM-3)</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Configure Fal.ai SAM-3 segmentation parameters. API Key is set in the API Keys tab.
                      </p>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md border border-border">
                          <div>
                            <label className="text-sm font-medium">Multimask Output</label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Return multiple mask options to choose from
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFalConfig({ ...falConfig, returnMultipleMasks: !falConfig.returnMultipleMasks })}
                            className={`relative w - 11 h - 6 rounded - full transition - colors ${falConfig.returnMultipleMasks ? 'bg-primary' : 'bg-muted-foreground/30'} `}
                          >
                            <span className={`absolute top - 0.5 left - 0.5 w - 5 h - 5 bg - white rounded - full shadow transition - transform ${falConfig.returnMultipleMasks ? 'translate-x-5' : 'translate-x-0'} `} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md border border-border">
                          <div>
                            <label className="text-sm font-medium">Include Scores</label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Include confidence scores in response
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFalConfig({ ...falConfig, includeScores: !(falConfig.includeScores !== false) })}
                            className={`relative w - 11 h - 6 rounded - full transition - colors ${falConfig.includeScores !== false ? 'bg-primary' : 'bg-muted-foreground/30'} `}
                          >
                            <span className={`absolute top - 0.5 left - 0.5 w - 5 h - 5 bg - white rounded - full shadow transition - transform ${falConfig.includeScores !== false ? 'translate-x-5' : 'translate-x-0'} `} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md border border-border">
                          <div>
                            <label className="text-sm font-medium">Include Boxes</label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Include bounding boxes in response
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFalConfig({ ...falConfig, includeBoxes: !(falConfig.includeBoxes !== false) })}
                            className={`relative w - 11 h - 6 rounded - full transition - colors ${falConfig.includeBoxes !== false ? 'bg-primary' : 'bg-muted-foreground/30'} `}
                          >
                            <span className={`absolute top - 0.5 left - 0.5 w - 5 h - 5 bg - white rounded - full shadow transition - transform ${falConfig.includeBoxes !== false ? 'translate-x-5' : 'translate-x-0'} `} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Writers Room AI Tab */}
              {activeTab === 'storyteller' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Writers Room AI Settings</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Configure the AI model used by the Storyteller agents (Showrunner, Plot Architect, etc.)
                    </p>
                    <div className="mb-6">
                      <ConnectionStatus
                        isConnected={
                          storytellerProvider === 'openai'
                            ? !!openaiConfig.apiKey
                            : storytellerProvider === 'gemini'
                              ? !!geminiConfig.apiKey
                              : !!anthropicApiKey
                        }
                        label={storytellerProvider === 'openai' ? 'OpenAI' : storytellerProvider === 'gemini' ? 'Gemini' : 'Anthropic'}
                      />
                    </div>

                    <div className="space-y-6">
                      {/* Model Provider Selection */}
                      <div className="p-4 rounded-lg bg-card border border-border space-y-4">
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4 text-primary" />
                          <h4 className="font-semibold text-sm">AI Model Provider</h4>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <button
                            onClick={() => setStorytellerProvider('openai')}
                            className={cn(
                              'p-4 border rounded-lg text-left transition-all',
                              storytellerProvider === 'openai'
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            <div className="font-medium">GPT-5.1</div>
                            <div className="text-xs text-muted-foreground">The smartest model</div>
                            {selectedModel?.id === 'gpt-5.1' && <Check className="w-4 h-4 text-primary" />}
                          </button>
                          <button
                            onClick={() => setStorytellerProvider('anthropic')}
                            className={cn(
                              'p-4 border rounded-lg text-left transition-all',
                              storytellerProvider === 'anthropic'
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            <div className="font-medium">Claude Sonnet 4</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Anthropic's creative model
                            </div>
                          </button>
                          <button
                            onClick={() => setStorytellerProvider('gemini')}
                            className={cn(
                              'p-4 border rounded-lg text-left transition-all',
                              storytellerProvider === 'gemini'
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            <div className="font-medium">Gemini 3 Pro</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Google's advanced model
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Model Info */}
                      <div className="p-4 rounded-lg bg-card border border-border space-y-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <h4 className="font-semibold text-sm">About the Models</h4>
                        </div>
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <p>
                            <strong>GPT-5.1:</strong> Great for structured reasoning, follows
                            instructions precisely. Best for Plot Architect and Consequence Tracker.
                          </p>
                          <p>
                            <strong>Claude Sonnet 4:</strong> Excellent creative writing, nuanced
                            character psychology. Best for Writer and Devil's Advocate.
                          </p>
                          <p>
                            <strong>Gemini 3 Pro:</strong> Google's latest model with strong
                            creative capabilities and large context window.
                          </p>
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
                      {/* Image Generation Keys */}
                      <div className="p-4 rounded-lg bg-card border border-border space-y-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <h4 className="font-semibold text-sm">Image Generation</h4>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-medium">Gemini / Nano Banana (Imagen)</label>
                              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => window.open('https://aistudio.google.com/app/apikey', '_blank')}>
                                Get Key
                              </Button>
                            </div>
                            <input
                              type="password"
                              value={geminiConfig.apiKey || ''}
                              onChange={e => setGeminiConfig({ ...geminiConfig, apiKey: e.target.value })}
                              placeholder="AIza..."
                              className="w-full p-2 rounded-md border border-input bg-background text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-medium">Comet API (Midjourney)</label>
                              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => window.open('https://cometapi.com', '_blank')}>
                                Get Key
                              </Button>
                            </div>
                            <input
                              type="password"
                              value={cometConfig.apiKey || ''}
                              onChange={e => setCometConfig({ ...cometConfig, apiKey: e.target.value })}
                              placeholder="Enter Comet API Key"
                              className="w-full p-2 rounded-md border border-input bg-background text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Upscaling Keys */}
                      <div className="p-4 rounded-lg bg-card border border-border space-y-4">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-primary" />
                          <h4 className="font-semibold text-sm">Upscaling</h4>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-medium">Stability AI</label>
                              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => window.open('https://platform.stability.ai/account/keys', '_blank')}>
                                Get Key
                              </Button>
                            </div>
                            <input
                              type="password"
                              value={upscale4kConfig.apiKey || ''}
                              onChange={e => setUpscale4kConfig({ ...upscale4kConfig, apiKey: e.target.value })}
                              placeholder="sk-..."
                              className="w-full p-2 rounded-md border border-input bg-background text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-medium">Replicate</label>
                              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => window.open('https://replicate.com/account/api-tokens', '_blank')}>
                                Get Key
                              </Button>
                            </div>
                            <input
                              type="password"
                              value={replicateConfig.apiKey || ''}
                              onChange={e => setReplicateConfig({ ...replicateConfig, apiKey: e.target.value })}
                              placeholder="r8_..."
                              className="w-full p-2 rounded-md border border-input bg-background text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 3D Generation Keys */}
                      <div className="p-4 rounded-lg bg-card border border-border space-y-4">
                        <div className="flex items-center gap-2">
                          <Box className="w-4 h-4 text-primary" />
                          <h4 className="font-semibold text-sm">3D Generation</h4>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-medium">Hyper3D</label>
                              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => window.open('https://www.hyper3d.ai', '_blank')}>
                                Get Key
                              </Button>
                            </div>
                            <input
                              type="password"
                              value={hyper3dConfig.apiKey || ''}
                              onChange={e => setHyper3dConfig({ ...hyper3dConfig, apiKey: e.target.value })}
                              placeholder="Enter Hyper3D API Key"
                              className="w-full p-2 rounded-md border border-input bg-background text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-medium">Meshy</label>
                              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => window.open('https://meshy.ai', '_blank')}>
                                Get Key
                              </Button>
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

                      {/* Tools & AI Keys */}
                      <div className="p-4 rounded-lg bg-card border border-border space-y-4">
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4 text-primary" />
                          <h4 className="font-semibold text-sm">Tools & AI</h4>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-medium">OpenAI</label>
                              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => window.open('https://platform.openai.com/api-keys', '_blank')}>
                                Get Key
                              </Button>
                            </div>
                            <input
                              type="password"
                              value={openaiConfig.apiKey || ''}
                              onChange={e => setOpenaiConfig({ ...openaiConfig, apiKey: e.target.value })}
                              placeholder="sk-..."
                              className="w-full p-2 rounded-md border border-input bg-background text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-medium">Anthropic (Claude)</label>
                              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => window.open('https://console.anthropic.com/settings/keys', '_blank')}>
                                Get Key
                              </Button>
                            </div>
                            <input
                              type="password"
                              value={anthropicApiKey}
                              onChange={e => setAnthropicApiKey(e.target.value)}
                              placeholder="sk-ant-..."
                              className="w-full p-2 rounded-md border border-input bg-background text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-medium">Fal.ai (Smart Select)</label>
                              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => window.open('https://fal.ai/dashboard/keys', '_blank')}>
                                Get Key
                              </Button>
                            </div>
                            <input
                              type="password"
                              value={falConfig.apiKey || ''}
                              onChange={e => setFalConfig({ ...falConfig, apiKey: e.target.value })}
                              placeholder="Enter your fal.ai API key"
                              className="w-full p-2 rounded-md border border-input bg-background text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Project Settings Tab */}
              {activeTab === 'projectSettings' && projectId && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Project Settings</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Configure project-specific settings for{' '}
                      <strong>{projectData?.name || 'this project'}</strong>
                    </p>

                    <div className="space-y-6">
                      {/* Style Reference URLs */}
                      <div>
                        <h4 className="text-sm font-semibold mb-3">
                          Character Portrait Style References
                        </h4>
                        <p className="text-xs text-muted-foreground mb-4">
                          Add Midjourney image URLs to use as style references (--sref parameter)
                          for character portrait generation. Multiple URLs can be added for style
                          blending.
                        </p>

                        {/* Current URLs */}
                        {styleReferenceUrls.length > 0 && (
                          <div className="space-y-2 mb-4">
                            {styleReferenceUrls.map((url, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 p-2 bg-muted/30 rounded-md border border-border"
                              >
                                <span className="text-xs flex-1 truncate font-mono">{url}</span>
                                <button
                                  onClick={() =>
                                    setStyleReferenceUrls(urls =>
                                      urls.filter((_, i) => i !== index)
                                    )
                                  }
                                  className="text-destructive hover:text-destructive/80 text-xs px-2 py-1"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add New URL */}
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={newStyleUrl}
                            onChange={e => setNewStyleUrl(e.target.value)}
                            placeholder="https://s.mj.run/..."
                            className="flex-1 p-2 rounded-md border border-input bg-background text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              if (newStyleUrl && newStyleUrl.startsWith('http')) {
                                setStyleReferenceUrls([...styleReferenceUrls, newStyleUrl])
                                setNewStyleUrl('')
                              }
                            }}
                            disabled={!newStyleUrl || !newStyleUrl.startsWith('http')}
                          >
                            Add URL
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          💡 Tip: Use Midjourney image URLs (e.g., https://s.mj.run/...) or any
                          publicly accessible image URL
                        </p>
                      </div>

                      {/* Save Button for Project Settings */}
                      <div className="pt-4 border-t border-border">
                        <Button
                          onClick={async () => {
                            try {
                              await fetch(`/ api / storyteller / projects / ${projectId} `, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  style_reference_urls: styleReferenceUrls,
                                }),
                              })
                              // Show success feedback
                              alert('Project settings saved!')
                            } catch (error) {
                              console.error('Failed to save project settings:', error)
                              alert('Failed to save project settings')
                            }
                          }}
                        >
                          Save Project Settings
                        </Button>
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
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </div >
    </div >
  )
}
