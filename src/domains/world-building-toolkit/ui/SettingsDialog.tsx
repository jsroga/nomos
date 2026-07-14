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
import { TESTABLE_LLM_PROVIDERS } from '@/shared/data/constants/llm-providers'
import { useWorldStore } from '@/domains/world-building-toolkit'
import {
  SETTINGS_API_KEYS_ENDPOINT,
  SETTINGS_CONTENT_TYPE_JSON,
  SETTINGS_COPIED_TOAST,
  SETTINGS_HTTP_DELETE,
  SETTINGS_HTTP_PATCH,
  SETTINGS_HTTP_POST,
  SETTINGS_LOAD_MCP_KEYS_FAILED_LOG,
  SETTINGS_LOAD_PROJECT_FAILED_LOG,
  SETTINGS_LOAD_PROVIDERS_FAILED_LOG,
  SETTINGS_MCP_CREATE_KEY_FAILED,
  SETTINGS_MCP_CREATE_KEY_FAILED_TOAST,
  SETTINGS_MCP_KEY_CREATED_TOAST,
  SETTINGS_MCP_KEY_NAME_REQUIRED,
  SETTINGS_MCP_KEY_REVOKED_TOAST,
  SETTINGS_MCP_REVOKE_KEY_FAILED,
  SETTINGS_PROVIDER_PROBE_ENDPOINT,
  SETTINGS_PROVIDERS_ENDPOINT,
  SETTINGS_SAVE_PROJECT_FAILED_LOG,
  SETTINGS_SAVE_PROJECT_FAILED_TOAST,
  SETTINGS_TEST_REQUEST_FAILED,
  SettingsDialogTab,
  SettingsStyleMode,
} from '@/domains/world-building-toolkit/constants/settings-dialog'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
  projectId?: string
}

type Tab = SettingsDialogTab

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

interface ProviderTestResult {
  ok: boolean
  latencyMs?: number
  model?: string
  error?: string
}

/**
 * Provider row with live status — no key / key untested / verified (latency)
 * / failed. Test fires ONE tiny generation through the same model-resolution
 * path production uses (POST /api/settings/providers/test).
 */
const TestableProviderRow = ({
  connected,
  label,
  result,
  testing,
  onTest,
}: {
  connected: boolean
  label: string
  result?: ProviderTestResult
  testing: boolean
  onTest: () => void
}) => (
  <div className="flex items-center gap-2 text-xs bg-muted/30 p-2 rounded border border-border w-full">
    <div
      className={cn(
        'w-2 h-2 rounded-full shrink-0',
        !connected
          ? 'bg-red-500'
          : result
            ? result.ok
              ? 'bg-green-500'
              : 'bg-red-500'
            : 'bg-yellow-500'
      )}
    />
    <span className="text-muted-foreground">{label}</span>
    <span className="ml-auto flex items-center gap-2 shrink-0">
      {result?.ok && (
        <span className="text-green-500" title={result.model}>
          {result.latencyMs}ms
        </span>
      )}
      {result && !result.ok && (
        <span className="text-red-400 max-w-36 truncate" title={result.error}>
          {result.error}
        </span>
      )}
      {!result && connected && <span className="text-yellow-500/80">untested</span>}
      <Button
        variant="outline"
        size="sm"
        className="h-6 px-2 text-[10px]"
        disabled={!connected || testing}
        onClick={onTest}
      >
        {testing ? 'Testing…' : 'Test'}
      </Button>
    </span>
  </div>
)

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose, projectId }) => {
  const loadProject = useWorldStore(state => state.loadProject)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [activeTab, setActiveTab] = useState<Tab>(SettingsDialogTab.General)

  // General tab state
  const [providers, setProviders] = useState<ProviderStatus | null>(null)
  const [loadingProviders, setLoadingProviders] = useState(false)

  // Live provider tests (PLAN-V2 1.4)
  const [providerTests, setProviderTests] = useState<Record<string, ProviderTestResult>>({})
  const [testingProvider, setTestingProvider] = useState<string | null>(null)

  const runProviderTest = async (providerKey: string): Promise<void> => {
    setTestingProvider(providerKey)
    try {
      const res = await fetch(SETTINGS_PROVIDER_PROBE_ENDPOINT, {
        method: SETTINGS_HTTP_POST,
        headers: { 'Content-Type': SETTINGS_CONTENT_TYPE_JSON },
        body: JSON.stringify({ providerKey }),
      })
      const data: ProviderTestResult = await res.json()
      setProviderTests(prev => ({ ...prev, [providerKey]: data }))
    } catch (error) {
      setProviderTests(prev => ({
        ...prev,
        [providerKey]: { ok: false, error: getErrorMessage(error) || SETTINGS_TEST_REQUEST_FAILED },
      }))
    } finally {
      setTestingProvider(null)
    }
  }

  // Sequential on purpose — provider rate limits, and our own 5/min limiter.
  const runAllProviderTests = async (): Promise<void> => {
    if (!providers) return
    for (const { key } of TESTABLE_LLM_PROVIDERS) {
      if (providers[key]) {
        await runProviderTest(key)
      }
    }
  }

  // Project Settings state
  const [projectData, setProjectData] = useState<ProjectData | null>(null)
  const [styleReferenceUrls, setStyleReferenceUrls] = useState<string[]>([])
  const [newStyleUrl, setNewStyleUrl] = useState<string>('')
  const [styleMode, setStyleMode] = useState<SettingsStyleMode>(SettingsStyleMode.Custom)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)

  const saveStyleSettings = async (
    mode: SettingsStyleMode,
    preset: string | null,
    urls: string[]
  ) => {
    if (!projectId) return
    try {
      const body: Record<string, unknown> = {}
      if (mode === SettingsStyleMode.Preset) {
        body.stylePreset = preset
        body.style_reference_urls = []
      } else {
        body.stylePreset = null
        body.style_reference_urls = urls
      }
      await fetch(`/api/storyteller/projects/${projectId}`, {
        method: SETTINGS_HTTP_PATCH,
        headers: { 'Content-Type': SETTINGS_CONTENT_TYPE_JSON },
        body: JSON.stringify(body),
      })
      await loadProject(projectId)
    } catch (error) {
      console.error(SETTINGS_SAVE_PROJECT_FAILED_LOG, error)
      toast.error(SETTINGS_SAVE_PROJECT_FAILED_TOAST)
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
      fetch(SETTINGS_PROVIDERS_ENDPOINT)
        .then(res => res.json())
        .then(data => setProviders(data.providers))
        .catch(err => console.error(SETTINGS_LOAD_PROVIDERS_FAILED_LOG, err))
        .finally(() => setLoadingProviders(false))

      // Load project settings if projectId provided
      if (projectId) {
        fetch(`/api/storyteller/projects/${projectId}`)
          .then(res => res.json())
          .then(data => {
            setProjectData(data)
            setStyleReferenceUrls(data.styleReferenceUrls || [])
            if (data.stylePreset) {
              setStyleMode(SettingsStyleMode.Preset)
              setSelectedPreset(data.stylePreset)
            } else {
              setStyleMode(SettingsStyleMode.Custom)
              setSelectedPreset(null)
            }
          })
          .catch(err => console.error(SETTINGS_LOAD_PROJECT_FAILED_LOG, err))
      }

      // Load MCP API keys
      setIsLoadingMcpKeys(true)
      fetch(SETTINGS_API_KEYS_ENDPOINT)
        .then(res => res.json())
        .then(data => setMcpKeys(data.apiKeys || []))
        .catch(err => console.error(SETTINGS_LOAD_MCP_KEYS_FAILED_LOG, err))
        .finally(() => setIsLoadingMcpKeys(false))
    }
  }, [isOpen, projectId])

  const handleSave = async () => {
    // If user is on Custom mode, persist the current URL list (including empty) on explicit Save
    if (styleMode === SettingsStyleMode.Custom) {
      await saveStyleSettings(SettingsStyleMode.Custom, null, styleReferenceUrls)
    }
    onClose()
  }

  // MCP Key Management
  const handleCreateMcpKey = async () => {
    if (!newMcpKeyName.trim()) {
      toast.error(SETTINGS_MCP_KEY_NAME_REQUIRED)
      return
    }
    setIsCreatingKey(true)
    setNewlyCreatedKey(null)
    try {
      const res = await fetch(SETTINGS_API_KEYS_ENDPOINT, {
        method: SETTINGS_HTTP_POST,
        headers: { 'Content-Type': SETTINGS_CONTENT_TYPE_JSON },
        body: JSON.stringify({ name: newMcpKeyName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || SETTINGS_MCP_CREATE_KEY_FAILED)

      setNewlyCreatedKey(data.apiKey.key)
      setMcpKeys(prev => [data.apiKey, ...prev])
      setNewMcpKeyName('')
      toast.success(SETTINGS_MCP_KEY_CREATED_TOAST)
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || SETTINGS_MCP_CREATE_KEY_FAILED_TOAST)
    } finally {
      setIsCreatingKey(false)
    }
  }

  const handleRevokeMcpKey = async (keyId: string) => {
    try {
      const res = await fetch(`${SETTINGS_API_KEYS_ENDPOINT}?id=${keyId}`, {
        method: SETTINGS_HTTP_DELETE,
      })
      if (!res.ok) throw new Error(SETTINGS_MCP_REVOKE_KEY_FAILED)
      setMcpKeys(prev => prev.filter(k => k.id !== keyId))
      toast.success(SETTINGS_MCP_KEY_REVOKED_TOAST)
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || SETTINGS_MCP_REVOKE_KEY_FAILED)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(SETTINGS_COPIED_TOAST)
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
              variant={activeTab === SettingsDialogTab.General ? 'secondary' : 'ghost'}
              className="w-full justify-start gap-2"
              onClick={() => setActiveTab(SettingsDialogTab.General)}
            >
              <Settings className="w-4 h-4" />
              General
            </Button>
            <Button
              variant={activeTab === SettingsDialogTab.McpKeys ? 'secondary' : 'ghost'}
              className="w-full justify-start gap-2"
              onClick={() => setActiveTab(SettingsDialogTab.McpKeys)}
            >
              <Key className="w-4 h-4" />
              MCP Keys
            </Button>
            {projectId && (
              <Button
                variant={activeTab === SettingsDialogTab.ProjectSettings ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-2"
                onClick={() => setActiveTab(SettingsDialogTab.ProjectSettings)}
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
              {activeTab === SettingsDialogTab.General && (
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
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-medium font-mono text-muted-foreground uppercase tracking-wider">
                                LLM Providers
                              </h5>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px]"
                                disabled={testingProvider !== null}
                                onClick={() => void runAllProviderTests()}
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
                                onTest={() => void runProviderTest(key)}
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
              {activeTab === SettingsDialogTab.McpKeys && (
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
              {activeTab === SettingsDialogTab.ProjectSettings && projectId && (
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
                            onClick={() => setStyleMode(SettingsStyleMode.Custom)}
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
                            onClick={() => setStyleMode(SettingsStyleMode.Preset)}
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

                        {/* Preset Mode */}
                        {styleMode === SettingsStyleMode.Preset && (
                          <div className="grid grid-cols-2 gap-2">
                            {STYLE_PRESETS.map(preset => (
                              <button
                                key={preset.id}
                                onClick={() => {
                                  const newPreset = selectedPreset === preset.id ? null : preset.id
                                  setSelectedPreset(newPreset)
                                  saveStyleSettings(SettingsStyleMode.Preset, newPreset, [])
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
                        {styleMode === SettingsStyleMode.Custom && (
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
                                        saveStyleSettings(SettingsStyleMode.Custom, null, updated)
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
                                    saveStyleSettings(SettingsStyleMode.Custom, null, updated)
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
