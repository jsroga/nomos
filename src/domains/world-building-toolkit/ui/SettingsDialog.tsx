import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Settings,
  Image as ImageIcon,
  Key,
  Info,
  Check,
} from 'lucide-react'
import { Button } from '@/components/Button'
import { ScrollArea } from '@/components/ScrollArea'
import { cn } from '@/shared/data/utils'
import toast from 'react-hot-toast'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { STYLE_PRESETS } from '@/shared/data/constants/style-presets'
import { useWorldStore } from '@/domains/world-building-toolkit'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
  projectId?: string
}

type Tab = 'general' | 'mcpkeys' | 'projectSettings'

interface ProviderStatus {
  openai: boolean
  anthropic: boolean
  google: boolean
  zhipu: boolean
  moonshot: boolean
  legnext: boolean
  stability: boolean
  replicate: boolean
  hyper3d: boolean
  meshy: boolean
  fal: boolean
  voyage: boolean
  langfuse: boolean
  langsmith: boolean
}

interface ProjectData {
  name?: string
  styleReferenceUrls?: string[]
  stylePreset?: string | null
  [key: string]: unknown
}

interface McpApiKey {
  id: string
  name: string
  scopes: string[]
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
  expires_at: string | null
}

const ConnectionDot = ({ connected, label }: { connected: boolean; label: string }) => (
  <div className="flex items-center gap-2 text-xs bg-muted/30 p-2 rounded border border-border w-full">
    <div
      className={cn(
        'w-2 h-2 rounded-full shrink-0',
        connected ? 'bg-green-500' : 'bg-red-500'
      )}
    />
    <span className="text-muted-foreground">
      {label}
    </span>
    {connected && <Check className="w-3 h-3 text-green-500 ml-auto shrink-0" />}
  </div>
)

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose, projectId }) => {
  const loadProject = useWorldStore(state => state.loadProject)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [activeTab, setActiveTab] = useState<Tab>('general')

  // General tab state
  const [providers, setProviders] = useState<ProviderStatus | null>(null)
  const [loadingProviders, setLoadingProviders] = useState(false)

  // Project Settings state
  const [projectData, setProjectData] = useState<ProjectData | null>(null)
  const [styleReferenceUrls, setStyleReferenceUrls] = useState<string[]>([])
  const [newStyleUrl, setNewStyleUrl] = useState<string>('')
  const [styleMode, setStyleMode] = useState<'preset' | 'custom'>('custom')
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)

  const saveStyleSettings = async (mode: 'preset' | 'custom', preset: string | null, urls: string[]) => {
    if (!projectId) return
    try {
      const body: Record<string, unknown> = {}
      if (mode === 'preset') {
        body.stylePreset = preset
        body.style_reference_urls = []
      } else {
        body.stylePreset = null
        body.style_reference_urls = urls
      }
      await fetch(`/api/storyteller/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      // Refresh store so Sidebar picks up the new stylePreset immediately
      await loadProject(projectId)
    } catch (error) {
      console.error('Failed to save project settings:', error)
      toast.error('Failed to save project settings')
    }
  }

  // MCP API Keys state
  const [mcpKeys, setMcpKeys] = useState<McpApiKey[]>([])
  const [isLoadingMcpKeys, setIsLoadingMcpKeys] = useState(false)
  const [newMcpKeyName, setNewMcpKeyName] = useState('')
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [isCreatingKey, setIsCreatingKey] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Fetch provider status
      setLoadingProviders(true)
      fetch('/api/settings/providers')
        .then(res => res.json())
        .then(data => setProviders(data.providers))
        .catch(err => console.error('Failed to load provider status:', err))
        .finally(() => setLoadingProviders(false))

      // Load project settings if projectId provided
      if (projectId) {
        fetch(`/api/storyteller/projects/${projectId}`)
          .then(res => res.json())
          .then(data => {
            setProjectData(data)
            setStyleReferenceUrls(data.styleReferenceUrls || [])
            if (data.stylePreset) {
              setStyleMode('preset')
              setSelectedPreset(data.stylePreset)
            } else {
              setStyleMode('custom')
              setSelectedPreset(null)
            }
          })
          .catch(err => console.error('Failed to load project:', err))
      }

      // Load MCP API keys
      setIsLoadingMcpKeys(true)
      fetch('/api/api-keys')
        .then(res => res.json())
        .then(data => setMcpKeys(data.apiKeys || []))
        .catch(err => console.error('Failed to load MCP keys:', err))
        .finally(() => setIsLoadingMcpKeys(false))
    }
  }, [isOpen, projectId])

  const handleSave = async () => {
    // If user is on Custom mode, persist the current URL list (including empty) on explicit Save
    if (styleMode === 'custom') {
      await saveStyleSettings('custom', null, styleReferenceUrls)
    }
    onClose()
  }

  // MCP Key Management
  const handleCreateMcpKey = async () => {
    if (!newMcpKeyName.trim()) {
      toast.error('Please enter a key name')
      return
    }
    setIsCreatingKey(true)
    setNewlyCreatedKey(null)
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMcpKeyName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create key')

      setNewlyCreatedKey(data.apiKey.key)
      setMcpKeys(prev => [data.apiKey, ...prev])
      setNewMcpKeyName('')
      toast.success('API key created! Save it now.')
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || 'Failed to create API key')
    } finally {
      setIsCreatingKey(false)
    }
  }

  const handleRevokeMcpKey = async (keyId: string) => {
    try {
      const res = await fetch(`/api/api-keys?id=${keyId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to revoke key')
      setMcpKeys(prev => prev.filter(k => k.id !== keyId))
      toast.success('API key revoked')
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || 'Failed to revoke key')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  if (!isOpen || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[600px] bg-zinc-950 border border-zinc-900 rounded-lg shadow-lg flex overflow-hidden relative text-zinc-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Sidebar */}
        <div className="w-[200px] bg-zinc-900/30 border-r border-zinc-900 flex flex-col p-4">
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
              variant={activeTab === 'mcpkeys' ? 'secondary' : 'ghost'}
              className="w-full justify-start gap-2"
              onClick={() => setActiveTab('mcpkeys')}
            >
              <Key className="w-4 h-4" />
              MCP Keys
            </Button>
            {projectId && (
              <Button
                variant={activeTab === 'projectSettings' ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-2"
                onClick={() => setActiveTab('projectSettings')}
              >
                <ImageIcon className="w-4 h-4" />
                Project Settings
              </Button>
            )}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <ScrollArea className="flex-1 p-6">
            <div className="max-w-2xl mx-auto space-y-8 pb-20">
              {/* General Tab */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  {/* Provider Connection Status */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Provider Status</h3>
                    <div className="p-4 rounded-lg bg-zinc-900/20 border border-zinc-900 space-y-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Info className="w-4 h-4 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          API keys are managed via environment variables. See <code className="text-xs">.env.local</code> for configuration.
                        </p>
                      </div>

                      {loadingProviders ? (
                        <div className="text-xs text-muted-foreground py-4 text-center">Loading provider status...</div>
                      ) : providers ? (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <h5 className="text-xs font-medium font-mono text-muted-foreground uppercase tracking-wider">
                              LLM Providers
                            </h5>
                            <ConnectionDot connected={providers.openai} label="OpenAI" />
                            <ConnectionDot connected={providers.anthropic} label="Anthropic" />
                            <ConnectionDot connected={providers.google} label="Google / Gemini" />
                            <ConnectionDot connected={providers.zhipu} label="Z.AI (GLM)" />
                            <ConnectionDot connected={providers.moonshot} label="Moonshot (Kimi)" />
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
                            <ConnectionDot connected={providers.langfuse} label="Langfuse" />
                            <ConnectionDot connected={providers.langsmith} label="LangSmith" />
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground py-4 text-center">Failed to load provider status</div>
                      )}
                    </div>
                  </div>

                  {/* Generation Info */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Generation</h3>
                    <div className="p-4 rounded-lg bg-zinc-900/20 border border-zinc-900 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        First tile uses <span className="text-zinc-300 font-mono">Midjourney</span>, follow-up tiles use <span className="text-zinc-300 font-mono">Nano Banana</span>. Providers and API keys are managed via environment variables on the server.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* MCP Keys Tab */}
              {activeTab === 'mcpkeys' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">MCP API Keys</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Generate keys for external MCP clients (Cursor, Claude Desktop, etc.)
                    </p>

                    <div className="p-4 rounded-lg bg-card border border-primary/30 space-y-4">
                      {/* Create new key */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newMcpKeyName}
                          onChange={e => setNewMcpKeyName(e.target.value)}
                          placeholder="Key name (e.g., My Cursor)"
                          className="flex-1 p-2 rounded-md border border-input bg-background text-sm"
                          onKeyDown={e => e.key === 'Enter' && handleCreateMcpKey()}
                        />
                        <Button size="sm" onClick={handleCreateMcpKey} disabled={isCreatingKey}>
                          {isCreatingKey ? 'Creating...' : '+ Create'}
                        </Button>
                      </div>

                      {/* Newly created key (show once) */}
                      {newlyCreatedKey && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-md space-y-2">
                          <div className="flex items-center gap-2 text-amber-500 text-xs font-medium">
                            <Info className="w-3 h-3" />
                            Save this key now — it won&apos;t be shown again!
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 p-2 bg-black/30 rounded text-xs font-mono truncate">
                              {newlyCreatedKey}
                            </code>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(newlyCreatedKey)}
                            >
                              Copy
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Existing keys list */}
                      {isLoadingMcpKeys ? (
                        <div className="text-xs text-muted-foreground">Loading keys...</div>
                      ) : mcpKeys.filter(k => !k.revoked_at).length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Your Keys
                          </div>
                          {mcpKeys
                            .filter(k => !k.revoked_at)
                            .map(key => (
                              <div
                                key={key.id}
                                className="flex items-center justify-between p-2 bg-muted/30 rounded-md border border-border"
                              >
                                <div>
                                  <div className="text-sm font-medium">{key.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Created {new Date(key.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  onClick={() => handleRevokeMcpKey(key.id)}
                                >
                                  Revoke
                                </Button>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          No keys yet. Create one above.
                        </div>
                      )}
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
                      {/* Style Reference Section */}
                      <div>
                        <h4 className="text-sm font-semibold mb-3">
                          Style References
                        </h4>
                        <p className="text-xs text-muted-foreground mb-4">
                          Choose a predefined style preset or provide your own Midjourney style
                          reference URLs (--sref parameter). Applied to all image generation.
                        </p>

                        {/* Mode Toggle */}
                        <div className="flex gap-1 p-1 bg-muted/40 rounded-lg mb-4 w-fit">
                          <button
                            onClick={() => setStyleMode('custom')}
                            className={cn(
                              'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                              styleMode === 'custom'
                                ? 'bg-background shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            Custom URLs
                          </button>
                          <button
                            onClick={() => setStyleMode('preset')}
                            className={cn(
                              'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                              styleMode === 'preset'
                                ? 'bg-background shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            Presets
                          </button>
                        </div>

                        {/* Preset Mode */}
                        {styleMode === 'preset' && (
                          <div className="grid grid-cols-2 gap-2">
                            {STYLE_PRESETS.map(preset => (
                              <button
                                key={preset.id}
                                onClick={() => {
                                  const newPreset = selectedPreset === preset.id ? null : preset.id
                                  setSelectedPreset(newPreset)
                                  saveStyleSettings('preset', newPreset, [])
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
                                  <div className="text-xs text-muted-foreground">
                                    {preset.description}
                                  </div>
                                </div>
                                {selectedPreset === preset.id && (
                                  <Check className="w-4 h-4 text-primary shrink-0" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Custom Mode */}
                        {styleMode === 'custom' && (
                          <div>
                            {/* Current URLs */}
                            {styleReferenceUrls.length > 0 && (
                              <div className="space-y-2 mb-4">
                                {styleReferenceUrls.map((url, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center gap-2 p-2 bg-muted/30 rounded-md border border-border"
                                  >
                                    <span className="text-xs flex-1 truncate font-mono">
                                      {url}
                                    </span>
                                    <button
                                      onClick={() => {
                                        const updated = styleReferenceUrls.filter((_, i) => i !== index)
                                        setStyleReferenceUrls(updated)
                                        saveStyleSettings('custom', null, updated)
                                      }}
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
                                    const updated = [...styleReferenceUrls, newStyleUrl]
                                    setStyleReferenceUrls(updated)
                                    setNewStyleUrl('')
                                    saveStyleSettings('custom', null, updated)
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
      </div>
    </div>,
    document.body
  )
}
